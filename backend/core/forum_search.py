"""
Elasticsearch integration for advanced forum search
"""

from typing import List, Dict, Optional
from datetime import datetime, timezone
import logging

from core.database import db
from elasticsearch import Elasticsearch
from elasticsearch.helpers import bulk

logger = logging.getLogger(__name__)


class ForumSearchEngine:
    """Elasticsearch-based search engine for forum"""
    
    def __init__(self, hosts: List[str] = None, index_name: str = "forum"):
        self.index_name = index_name
        self.es = None
        self.elasticsearch_enabled = False
        
        try:
            self.es = Elasticsearch(hosts or ["http://localhost:9200"])
            # Test connection
            if self.es.ping():
                self.elasticsearch_enabled = True
                self._create_index_if_not_exists()
                logger.info("Elasticsearch connected successfully")
            else:
                logger.warning("Elasticsearch ping failed, using MongoDB fallback")
        except Exception as e:
            logger.warning(f"Elasticsearch connection failed: {e}, using MongoDB fallback")
    
    def _create_index_if_not_exists(self):
        """Create Elasticsearch index if it doesn't exist"""
        if not self.elasticsearch_enabled or not self.es:
            return
            
        if not self.es.indices.exists(index=self.index_name):
            mapping = {
                "mappings": {
                    "properties": {
                        "title": {
                            "type": "text",
                            "fields": {
                                "keyword": {"type": "keyword"},
                                "ngram": {"type": "text", "analyzer": "ngram_analyzer"}
                            }
                        },
                        "content": {
                            "type": "text",
                            "fields": {
                                "ngram": {"type": "text", "analyzer": "ngram_analyzer"}
                            }
                        },
                        "author_name": {"type": "text", "fields": {"keyword": {"type": "keyword"}}},
                        "category_name": {"type": "text", "fields": {"keyword": {"type": "keyword"}}},
                        "tags": {"type": "keyword"},
                        "created_at": {"type": "date"},
                        "updated_at": {"type": "date"},
                        "view_count": {"type": "integer"},
                        "comment_count": {"type": "integer"},
                        "is_pinned": {"type": "boolean"},
                        "author_id": {"type": "keyword"},
                        "category_id": {"type": "keyword"}
                    }
                },
                "settings": {
                    "analysis": {
                        "analyzer": {
                            "ngram_analyzer": {
                                "type": "custom",
                                "tokenizer": "ngram_tokenizer",
                                "filter": ["lowercase"]
                            }
                        },
                        "tokenizer": {
                            "ngram_tokenizer": {
                                "type": "ngram",
                                "min_gram": 2,
                                "max_gram": 3
                            }
                        }
                    }
                }
            }
            self.es.indices.create(index=self.index_name, body=mapping)
            logger.info(f"Created Elasticsearch index: {self.index_name}")
    
    async def index_topic(self, topic: Dict):
        """Index a single topic"""
        if not self.elasticsearch_enabled or not self.es:
            return
            
        doc = {
            "id": topic["id"],
            "title": topic.get("title", ""),
            "content": topic.get("content", ""),
            "author_name": topic.get("author_name", ""),
            "author_id": topic.get("author_id", ""),
            "category_id": topic.get("category_id", ""),
            "category_name": topic.get("category_name", ""),
            "tags": topic.get("tags", []),
            "created_at": topic.get("created_at"),
            "updated_at": topic.get("updated_at"),
            "view_count": topic.get("view_count", 0),
            "comment_count": topic.get("comment_count", 0),
            "is_pinned": topic.get("is_pinned", False)
        }
        
        self.es.index(index=self.index_name, id=topic["id"], body=doc)
        logger.info(f"Indexed topic: {topic['id']}")
    
    async def index_topics_bulk(self, topics: List[Dict]):
        """Bulk index multiple topics"""
        if not self.elasticsearch_enabled or not self.es:
            logger.warning("Elasticsearch not available, skipping bulk index")
            return
        actions = []
        for topic in topics:
            action = {
                "_index": self.index_name,
                "_id": topic["id"],
                "_source": {
                    "id": topic["id"],
                    "title": topic.get("title", ""),
                    "content": topic.get("content", ""),
                    "author_name": topic.get("author_name", ""),
                    "author_id": topic.get("author_id", ""),
                    "category_id": topic.get("category_id", ""),
                    "category_name": topic.get("category_name", ""),
                    "tags": topic.get("tags", []),
                    "created_at": topic.get("created_at"),
                    "updated_at": topic.get("updated_at"),
                    "view_count": topic.get("view_count", 0),
                    "comment_count": topic.get("comment_count", 0),
                    "is_pinned": topic.get("is_pinned", False)
                }
            }
            actions.append(action)
        
        success, failed = bulk(self.es, actions)
        logger.info(f"Bulk indexed {success} topics, {failed} failed")
    
    async def search(
        self,
        query: str,
        category_id: Optional[str] = None,
        tags: Optional[List[str]] = None,
        author_id: Optional[str] = None,
        sort_by: str = "relevance",
        page: int = 1,
        limit: int = 20
    ) -> Dict:
        """
        Search topics with advanced filters
        sort_by: relevance, recent, popular, views
        """
        # Build query
        must_clauses = []
        
        # Full-text search with ngram for fuzzy matching
        if query:
            must_clauses.append({
                "multi_match": {
                    "query": query,
                    "fields": ["title^3", "content", "author_name^2"],
                    "type": "best_fields",
                    "fuzziness": "AUTO"
                }
            })
        
        # Filter by category
        if category_id:
            must_clauses.append({"term": {"category_id": category_id}})
        
        # Filter by tags
        if tags:
            must_clauses.append({"terms": {"tags": tags}})
        
        # Filter by author
        if author_id:
            must_clauses.append({"term": {"author_id": author_id}})
        
        # Build Elasticsearch query
        es_query = {
            "query": {
                "bool": {
                    "must": must_clauses if must_clauses else [{"match_all": {}}]
                }
            },
            "highlight": {
                "fields": {
                    "title": {},
                    "content": {}
                }
            }
        }
        
        # Sorting
        if sort_by == "recent":
            es_query["sort"] = [{"updated_at": {"order": "desc"}}]
        elif sort_by == "popular":
            es_query["sort"] = [{"comment_count": {"order": "desc"}}]
        elif sort_by == "views":
            es_query["sort"] = [{"view_count": {"order": "desc"}}]
        else:  # relevance
            es_query["sort"] = ["_score"]
        
        # Pagination
        es_query["from"] = (page - 1) * limit
        es_query["size"] = limit
        
        # Execute search
        response = self.es.search(index=self.index_name, body=es_query)
        
        # Process results
        results = []
        for hit in response["hits"]["hits"]:
            topic = hit["_source"]
            topic["score"] = hit["_score"]
            
            # Add highlights
            if "highlight" in hit:
                topic["highlights"] = hit["highlight"]
            
            results.append(topic)
        
        return {
            "results": results,
            "total": response["hits"]["total"]["value"],
            "page": page,
            "limit": limit,
            "total_pages": (response["hits"]["total"]["value"] + limit - 1) // limit
        }
    
    async def get_autocomplete_suggestions(self, query: str, limit: int = 10) -> List[str]:
        """Get autocomplete suggestions for search query"""
        es_query = {
            "query": {
                "multi_match": {
                    "query": query,
                    "fields": ["title.ngram", "content.ngram"],
                    "type": "phrase_prefix"
                }
            },
            "size": limit,
            "_source": ["title"]
        }
        
        response = self.es.search(index=self.index_name, body=es_query)
        
        suggestions = []
        for hit in response["hits"]["hits"]:
            suggestions.append(hit["_source"]["title"])
        
        return suggestions
    
    async def delete_topic(self, topic_id: str):
        """Delete a topic from index"""
        if not self.elasticsearch_enabled or not self.es:
            logger.warning("Elasticsearch not available, skipping delete")
            return
        self.es.delete(index=self.index_name, id=topic_id)
        logger.info(f"Deleted topic from index: {topic_id}")
    
    async def update_topic(self, topic: Dict):
        """Update a topic in index"""
        if not self.elasticsearch_enabled or not self.es:
            return
        await self.index_topic(topic)
    
    async def get_search_analytics(self, days: int = 7) -> Dict:
        """Get search analytics for the past N days"""
        # This would require tracking search queries separately
        # For now, return basic stats
        total_docs = self.es.count(index=self.index_name)["count"]
        
        return {
            "total_indexed_documents": total_docs,
            "index_name": self.index_name
        }
    
    async def sync_from_database(self):
        """Sync all topics from MongoDB to Elasticsearch"""
        topics = await db.forum_topics.find({}, {"_id": 0}).to_list(None)
        
        # Add category names
        for topic in topics:
            category = await db.forum_categories.find_one(
                {"id": topic["category_id"]},
                {"_id": 0, "name": 1}
            )
            if category:
                topic["category_name"] = category["name"]
        
        await self.index_topics_bulk(topics)
        logger.info(f"Synced {len(topics)} topics from database")


# Global instance
forum_search_engine = ForumSearchEngine()
