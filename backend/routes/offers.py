# Routes pour le système d'offres
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from datetime import datetime, timedelta
from typing import List, Optional
import secrets
import uuid

from core.database import db
from models.schemas import (
    OfferCreate, OfferResponse, OfferCounter, 
    NegotiatedLink, OfferStatus, UserRole
)

router = APIRouter(prefix="/offers", tags=["offers"])
security = HTTPBearer()

OFFER_EXPIRATION_HOURS = 48
LINK_EXPIRATION_HOURS = 24


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Récupère l'utilisateur actuel depuis le token"""
    token = credentials.credentials
    user = db.users.find_one({"token": token})
    if not user:
        raise HTTPException(status_code=401, detail="Token invalide")
    return user


@router.post("/create")
async def create_offer(
    offer: OfferCreate,
    current_user: dict = Depends(get_current_user)
):
    """Créer une nouvelle offre sur un produit"""
    # Vérifier que le produit existe
    product = await db.products.find_one({"id": offer.product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    
    # Vérifier que l'utilisateur n'est pas le vendeur du produit
    if product.get("seller_id") == current_user.get("id"):
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas faire d'offre sur votre propre produit")
    
    # Vérifier si une offre similaire existe déjà (pending)
    existing_offer = await db.offers.find_one({
        "product_id": offer.product_id,
        "buyer_id": current_user.get("id"),
        "status": OfferStatus.PENDING
    })
    if existing_offer:
        raise HTTPException(status_code=400, detail="Vous avez déjà une offre en cours sur ce produit")
    
    # Créer l'offre
    offer_data = {
        "id": str(uuid.uuid4()),
        "product_id": offer.product_id,
        "buyer_id": current_user.get("id"),
        "vendor_id": product.get("seller_id"),
        "vendor_role": "vendor",
        "offered_price_fcfa": offer.offered_price_fcfa,
        "original_price_fcfa": product.get("price_fcfa"),
        "quantity": offer.quantity,
        "message": offer.message,
        "status": OfferStatus.PENDING,
        "created_at": datetime.utcnow(),
        "expires_at": datetime.utcnow() + timedelta(hours=OFFER_EXPIRATION_HOURS),
        "history": [
            {
                "action": "created",
                "price": offer.offered_price_fcfa,
                "message": offer.message,
                "timestamp": datetime.utcnow(),
                "actor": current_user.get("id"),
                "actor_name": current_user.get("name")
            }
        ]
    }
    
    await db.offers.insert_one(offer_data)
    
    # Notification au vendeur (à implémenter avec WebSocket)
    # TODO: Envoyer notification WebSocket au vendeur
    
    return {
        "message": "Offre créée avec succès",
        "offer_id": offer_data["_id"],
        "expires_at": offer_data["expires_at"]
    }


@router.get("/received")
async def get_received_offers(
    current_user: dict = Depends(get_current_user)
):
    """Récupérer les offres reçues par le vendeur"""
    offers = await db.offers.find({
        "vendor_id": current_user.get("id"),
        "status": {"$in": [OfferStatus.PENDING, OfferStatus.COUNTER_OFFER]}
    }).to_list(length=None)
    
    # Enrichir avec les infos du produit et de l'acheteur
    enriched_offers = []
    for offer in offers:
        product = await db.products.find_one({"id": offer["product_id"]})
        buyer = await db.users.find_one({"id": offer["buyer_id"]})
        
        enriched_offers.append({
            **offer,
            "product": {
                "name": product.get("name") if product else "Produit supprimé",
                "image": product.get("images", [])[0] if product and product.get("images") else None,
                "price_fcfa": product.get("price_fcfa") if product else 0
            },
            "buyer": {
                "name": buyer.get("name") if buyer else "Utilisateur supprimé",
                "email": buyer.get("email") if buyer else None
            }
        })
    
    return {"offers": enriched_offers}


@router.get("/sent")
async def get_sent_offers(
    current_user: dict = Depends(get_current_user)
):
    """Récupérer les offres envoyées par l'acheteur"""
    offers = await db.offers.find({
        "buyer_id": current_user.get("id")
    }).to_list(length=None)
    
    # Enrichir avec les infos du produit et du vendeur
    enriched_offers = []
    for offer in offers:
        product = await db.products.find_one({"id": offer["product_id"]})
        vendor = await db.users.find_one({"id": offer["vendor_id"]})
        
        enriched_offers.append({
            **offer,
            "product": {
                "name": product.get("name") if product else "Produit supprimé",
                "image": product.get("images", [])[0] if product and product.get("images") else None,
                "price_fcfa": product.get("price_fcfa") if product else 0
            },
            "vendor": {
                "name": vendor.get("name") if vendor else "Vendeur supprimé",
                "role": vendor.get("role") if vendor else "unknown"
            }
        })
    
    return {"offers": enriched_offers}


@router.post("/{offer_id}/respond")
async def respond_to_offer(
    offer_id: str,
    response: OfferResponse,
    current_user: dict = Depends(get_current_user)
):
    """Répondre à une offre (accepter/rejeter)"""
    offer = await db.offers.find_one({"id": offer_id})
    if not offer:
        raise HTTPException(status_code=404, detail="Offre non trouvée")
    
    # Vérifier que l'utilisateur est le vendeur
    if offer["vendor_id"] != current_user.get("id"):
        raise HTTPException(status_code=403, detail="Vous n'êtes pas autorisé à répondre à cette offre")
    
    if offer["status"] != OfferStatus.PENDING:
        raise HTTPException(status_code=400, detail="Cette offre n'est plus en attente")
    
    # Vérifier l'expiration
    if datetime.utcnow() > offer["expires_at"]:
        await db.offers.update_one(
            {"id": offer_id},
            {"$set": {"status": OfferStatus.EXPIRED}}
        )
        raise HTTPException(status_code=400, detail="Cette offre a expiré")
    
    # Mettre à jour l'offre
    update_data = {
        "status": response.status,
        "response_message": response.response_message,
        "responded_at": datetime.utcnow(),
        "responded_by": current_user.get("id")
    }
    
    if response.status == OfferStatus.ACCEPTED:
        # Générer un lien de paiement sécurisé
        link_token = secrets.token_urlsafe(32)
        link_expires = datetime.utcnow() + timedelta(hours=LINK_EXPIRATION_HOURS)
        
        update_data.update({
            "negotiated_link_token": link_token,
            "negotiated_link_expires": link_expires,
            "final_price_fcfa": offer["offered_price_fcfa"]
        })
    
    await db.offers.update_one(
        {"id": offer_id},
        {"$set": update_data, "$push": {
            "history": {
                "action": "responded",
                "status": response.status,
                "message": response.response_message,
                "timestamp": datetime.utcnow(),
                "actor": current_user.get("id"),
                "actor_name": current_user.get("name")
            }
        }}
    )
    
    # Notification à l'acheteur (à implémenter avec WebSocket)
    # TODO: Envoyer notification WebSocket à l'acheteur
    
    return {"message": f"Offre {response.status} avec succès"}


@router.post("/{offer_id}/counter")
async def counter_offer(
    offer_id: str,
    counter: OfferCounter,
    current_user: dict = Depends(get_current_user)
):
    """Faire une contre-offre"""
    offer = await db.offers.find_one({"id": offer_id})
    if not offer:
        raise HTTPException(status_code=404, detail="Offre non trouvée")
    
    # Vérifier que l'utilisateur est le vendeur
    if offer["vendor_id"] != current_user.get("id"):
        raise HTTPException(status_code=403, detail="Vous n'êtes pas autorisé à faire une contre-offre")
    
    if offer["status"] not in [OfferStatus.PENDING, OfferStatus.COUNTER_OFFER]:
        raise HTTPException(status_code=400, detail="Cette offre ne peut plus recevoir de contre-offre")
    
    # Mettre à jour l'offre
    await db.offers.update_one(
        {"id": offer_id},
        {"$set": {
            "status": OfferStatus.COUNTER_OFFER,
            "counter_price_fcfa": counter.counter_price_fcfa,
            "counter_message": counter.message,
            "countered_at": datetime.utcnow(),
            "countered_by": current_user.get("id"),
            "expires_at": datetime.utcnow() + timedelta(hours=OFFER_EXPIRATION_HOURS)
        }, "$push": {
            "history": {
                "action": "counter_offer",
                "price": counter.counter_price_fcfa,
                "message": counter.message,
                "timestamp": datetime.utcnow(),
                "actor": current_user.get("id"),
                "actor_name": current_user.get("name")
            }
        }}
    )
    
    # Notification à l'acheteur (à implémenter avec WebSocket)
    # TODO: Envoyer notification WebSocket à l'acheteur
    
    return {"message": "Contre-offre envoyée avec succès"}


@router.post("/{offer_id}/accept-counter")
async def accept_counter_offer(
    offer_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Accepter une contre-offre (par l'acheteur)"""
    offer = await db.offers.find_one({"id": offer_id})
    if not offer:
        raise HTTPException(status_code=404, detail="Offre non trouvée")
    
    # Vérifier que l'utilisateur est l'acheteur
    if offer["buyer_id"] != current_user.get("id"):
        raise HTTPException(status_code=403, detail="Vous n'êtes pas autorisé à accepter cette contre-offre")
    
    if offer["status"] != OfferStatus.COUNTER_OFFER:
        raise HTTPException(status_code=400, detail="Cette offre n'est pas en état de contre-offre")
    
    # Générer un lien de paiement sécurisé
    link_token = secrets.token_urlsafe(32)
    link_expires = datetime.utcnow() + timedelta(hours=LINK_EXPIRATION_HOURS)
    
    await db.offers.update_one(
        {"id": offer_id},
        {"$set": {
            "status": OfferStatus.ACCEPTED,
            "final_price_fcfa": offer["counter_price_fcfa"],
            "negotiated_link_token": link_token,
            "negotiated_link_expires": link_expires,
            "accepted_at": datetime.utcnow()
        }, "$push": {
            "history": {
                "action": "accepted_counter",
                "price": offer["counter_price_fcfa"],
                "timestamp": datetime.utcnow(),
                "actor": current_user.get("id"),
                "actor_name": current_user.get("name")
            }
        }}
    )
    
    # Notification au vendeur (à implémenter avec WebSocket)
    # TODO: Envoyer notification WebSocket au vendeur
    
    return {"message": "Contre-offre acceptée avec succès"}


@router.post("/{offer_id}/withdraw")
async def withdraw_offer(
    offer_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Retirer une offre (par l'acheteur)"""
    offer = await db.offers.find_one({"id": offer_id})
    if not offer:
        raise HTTPException(status_code=404, detail="Offre non trouvée")
    
    # Vérifier que l'utilisateur est l'acheteur
    if offer["buyer_id"] != current_user.get("id"):
        raise HTTPException(status_code=403, detail="Vous n'êtes pas autorisé à retirer cette offre")
    
    if offer["status"] not in [OfferStatus.PENDING, OfferStatus.COUNTER_OFFER]:
        raise HTTPException(status_code=400, detail="Cette offre ne peut plus être retirée")
    
    await db.offers.update_one(
        {"id": offer_id},
        {"$set": {
            "status": OfferStatus.WITHDRAWN,
            "withdrawn_at": datetime.utcnow()
        }, "$push": {
            "history": {
                "action": "withdrawn",
                "timestamp": datetime.utcnow(),
                "actor": current_user.get("id"),
                "actor_name": current_user.get("name")
            }
        }}
    )
    
    return {"message": "Offre retirée avec succès"}


@router.get("/link/{token}")
async def get_negotiated_link(token: str):
    """Récupérer les détails d'une offre via le lien négocié"""
    offer = await db.offers.find_one({"negotiated_link_token": token})
    if not offer:
        raise HTTPException(status_code=404, detail="Lien invalide ou expiré")
    
    # Vérifier l'expiration du lien
    if datetime.utcnow() > offer["negotiated_link_expires"]:
        raise HTTPException(status_code=400, detail="Ce lien a expiré")
    
    # Vérifier que l'offre est acceptée
    if offer["status"] != OfferStatus.ACCEPTED:
        raise HTTPException(status_code=400, detail="Cette offre n'a pas été acceptée")
    
    product = await db.products.find_one({"id": offer["product_id"]})
    
    return {
        "offer_id": offer["id"],
        "product": {
            "id": product["id"] if product else None,
            "name": product.get("name") if product else "Produit supprimé",
            "image": product.get("images", [])[0] if product and product.get("images") else None,
            "original_price_fcfa": offer["original_price_fcfa"],
            "negotiated_price_fcfa": offer["final_price_fcfa"],
            "quantity": offer["quantity"],
            "discount_percent": round((1 - offer["final_price_fcfa"] / offer["original_price_fcfa"]) * 100, 1) if offer["original_price_fcfa"] > 0 else 0
        },
        "expires_at": offer["negotiated_link_expires"]
    }


@router.get("/{offer_id}")
async def get_offer_details(
    offer_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Récupérer les détails d'une offre"""
    offer = await db.offers.find_one({"id": offer_id})
    if not offer:
        raise HTTPException(status_code=404, detail="Offre non trouvée")
    
    # Vérifier que l'utilisateur est impliqué dans l'offre
    if offer["buyer_id"] != current_user.get("id") and offer["vendor_id"] != current_user.get("id"):
        raise HTTPException(status_code=403, detail="Vous n'êtes pas autorisé à voir cette offre")
    
    product = await db.products.find_one({"id": offer["product_id"]})
    other_party_id = offer["vendor_id"] if current_user.get("id") == offer["buyer_id"] else offer["buyer_id"]
    other_party = await db.users.find_one({"id": other_party_id})
    
    return {
        **offer,
        "product": {
            "name": product.get("name") if product else "Produit supprimé",
            "image": product.get("images", [])[0] if product and product.get("images") else None,
            "price_fcfa": product.get("price_fcfa") if product else 0
        },
        "other_party": {
            "name": other_party.get("name") if other_party else "Utilisateur supprimé",
            "email": other_party.get("email") if other_party else None
        }
    }
