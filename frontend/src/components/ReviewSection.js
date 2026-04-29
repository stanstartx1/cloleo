import React, { useState, useEffect } from 'react';
import { Star, ThumbsUp, Flag, ChevronDown, MessageSquare, CheckCircle, User } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

const StarRating = ({ rating, onRatingChange, size = 'md', interactive = false }) => {
  const [hoverRating, setHoverRating] = useState(0);
  const sizes = { sm: 'w-4 h-4', md: 'w-5 h-5', lg: 'w-6 h-6' };
  
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          className={`${interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'} transition-transform`}
          onMouseEnter={() => interactive && setHoverRating(star)}
          onMouseLeave={() => interactive && setHoverRating(0)}
          onClick={() => interactive && onRatingChange && onRatingChange(star)}
        >
          <Star
            className={`${sizes[size]} ${
              star <= (hoverRating || rating)
                ? 'text-yellow-400 fill-yellow-400'
                : 'text-gray-300'
            }`}
          />
        </button>
      ))}
    </div>
  );
};

const RatingDistribution = ({ distribution, total }) => {
  if (!distribution || total === 0) return null;
  
  return (
    <div className="space-y-2">
      {[5, 4, 3, 2, 1].map((rating) => {
        const count = distribution[String(rating)] || 0;
        const percentage = total > 0 ? (count / total) * 100 : 0;
        
        return (
          <div key={rating} className="flex items-center gap-2 text-sm">
            <span className="w-3">{rating}</span>
            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-yellow-400 rounded-full transition-all duration-300"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <span className="w-8 text-gray-500 text-xs">{count}</span>
          </div>
        );
      })}
    </div>
  );
};

const ReviewCard = ({ review, onHelpful, onReport }) => {
  const [showReportMenu, setShowReportMenu] = useState(false);
  
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  };
  
  return (
    <div className="border-b border-gray-100 py-4 last:border-0">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
          <User className="w-5 h-5 text-orange-600" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium">{review.user_name}</span>
            {review.is_verified_purchase && (
              <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                <CheckCircle className="w-3 h-3" /> Achat verifie
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <StarRating rating={review.rating} size="sm" />
            <span className="text-sm text-gray-500">{formatDate(review.created_at)}</span>
          </div>
          {review.comment && (
            <p className="mt-2 text-gray-700">{review.comment}</p>
          )}
          <div className="flex items-center gap-4 mt-3">
            <button
              onClick={() => onHelpful(review.id)}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
            >
              <ThumbsUp className="w-4 h-4" />
              <span>Utile ({review.helpful_count || 0})</span>
            </button>
            <div className="relative">
              <button
                onClick={() => setShowReportMenu(!showReportMenu)}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-500"
              >
                <Flag className="w-4 h-4" />
                <span>Signaler</span>
              </button>
              {showReportMenu && (
                <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg py-1 z-10 min-w-[150px]">
                  {['Inapproprie', 'Spam', 'Faux avis'].map((reason) => (
                    <button
                      key={reason}
                      onClick={() => {
                        onReport(review.id, reason.toLowerCase());
                        setShowReportMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                    >
                      {reason}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ReviewForm = ({ productId, onReviewSubmitted }) => {
  const { isAuthenticated, token } = useAuth();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) {
      toast.error('Veuillez donner une note');
      return;
    }
    
    setLoading(true);
    try {
      await axios.post(`${API}/reviews`, {
        product_id: productId,
        rating,
        comment: comment.trim() || null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Avis publie avec succes !');
      setRating(0);
      setComment('');
      onReviewSubmitted();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la publication');
    } finally {
      setLoading(false);
    }
  };
  
  if (!isAuthenticated) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 text-center">
        <MessageSquare className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-600">Connectez-vous pour laisser un avis</p>
      </div>
    );
  }
  
  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 rounded-lg p-4">
      <h4 className="font-medium mb-3">Donner votre avis</h4>
      <div className="mb-3">
        <label className="block text-sm text-gray-600 mb-1">Votre note</label>
        <StarRating rating={rating} onRatingChange={setRating} size="lg" interactive />
      </div>
      <div className="mb-3">
        <label className="block text-sm text-gray-600 mb-1">Votre commentaire (optionnel)</label>
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Partagez votre experience avec ce produit..."
          rows={3}
          className="resize-none"
        />
      </div>
      <Button type="submit" disabled={loading || rating === 0} className="w-full">
        {loading ? 'Publication...' : 'Publier mon avis'}
      </Button>
    </form>
  );
};

const ReviewSection = ({ productId }) => {
  const { isAuthenticated, token } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({ average_rating: 0, review_count: 0, distribution: {} });
  const [loading, setLoading] = useState(true);
  const [canReview, setCanReview] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [sortBy, setSortBy] = useState('recent');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  const fetchReviews = async () => {
    try {
      const response = await axios.get(`${API}/reviews/product/${productId}?page=${page}&sort=${sortBy}`);
      setReviews(response.data.reviews);
      setStats({
        average_rating: response.data.average_rating,
        review_count: response.data.review_count,
        distribution: response.data.distribution
      });
      setTotalPages(response.data.total_pages);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const checkCanReview = async () => {
    if (!isAuthenticated || !token) {
      setCanReview(false);
      return;
    }
    try {
      const response = await axios.get(`${API}/reviews/check/${productId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCanReview(response.data.can_review);
    } catch (error) {
      setCanReview(false);
    }
  };
  
  useEffect(() => {
    fetchReviews();
    checkCanReview();
  }, [productId, page, sortBy, isAuthenticated]);
  
  const handleHelpful = async (reviewId) => {
    try {
      await axios.post(`${API}/reviews/${reviewId}/helpful`, {}, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      toast.success('Merci pour votre retour !');
      fetchReviews();
    } catch (error) {
      toast.error('Erreur');
    }
  };
  
  const handleReport = async (reviewId, reason) => {
    if (!isAuthenticated) {
      toast.error('Connectez-vous pour signaler un avis');
      return;
    }
    try {
      await axios.post(`${API}/reviews/${reviewId}/report?reason=${reason}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Signalement envoye');
    } catch (error) {
      toast.error('Erreur lors du signalement');
    }
  };
  
  const handleReviewSubmitted = () => {
    setShowForm(false);
    setCanReview(false);
    fetchReviews();
  };
  
  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-6 bg-gray-200 rounded w-1/4"></div>
        <div className="h-20 bg-gray-200 rounded"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6" data-testid="review-section">
      {/* Header with stats */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* Average rating */}
        <div className="text-center md:text-left">
          <div className="text-5xl font-bold text-gray-900">{stats.average_rating.toFixed(1)}</div>
          <StarRating rating={Math.round(stats.average_rating)} size="md" />
          <p className="text-sm text-gray-500 mt-1">{stats.review_count} avis</p>
        </div>
        
        {/* Distribution */}
        <div className="flex-1 max-w-xs">
          <RatingDistribution distribution={stats.distribution} total={stats.review_count} />
        </div>
        
        {/* Write review button */}
        {canReview && (
          <div className="md:ml-auto">
            <Button
              onClick={() => setShowForm(!showForm)}
              className="bg-orange-500 hover:bg-orange-600"
            >
              <Star className="w-4 h-4 mr-2" />
              Ecrire un avis
            </Button>
          </div>
        )}
      </div>
      
      {/* Review form */}
      {showForm && canReview && (
        <ReviewForm productId={productId} onReviewSubmitted={handleReviewSubmitted} />
      )}
      
      {/* Sort options */}
      {reviews.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Trier par:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="text-sm border rounded-lg px-2 py-1"
          >
            <option value="recent">Plus recents</option>
            <option value="helpful">Plus utiles</option>
            <option value="highest">Meilleures notes</option>
            <option value="lowest">Notes les plus basses</option>
          </select>
        </div>
      )}
      
      {/* Reviews list */}
      {reviews.length > 0 ? (
        <div className="divide-y divide-gray-100">
          {reviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              onHelpful={handleHelpful}
              onReport={handleReport}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>Aucun avis pour le moment</p>
          {canReview && (
            <p className="text-sm mt-2">Soyez le premier a donner votre avis !</p>
          )}
        </div>
      )}
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`w-8 h-8 rounded-full text-sm ${
                p === page
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReviewSection;
export { StarRating, RatingDistribution };
