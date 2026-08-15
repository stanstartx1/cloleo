"""
Forum gamification system
Points, badges, ranks, and leaderboards
"""

from datetime import datetime, timezone
from typing import Dict, List, Optional
from pydantic import BaseModel

from core.database import db


class GamificationEngine:
    """Engine for calculating forum gamification"""
    
    # Point values for actions
    POINT_VALUES = {
        'create_topic': 10,
        'create_comment': 5,
        'receive_like': 2,
        'receive_best_answer': 20,
        'daily_login': 1,
        'streak_bonus': 5,
        'first_comment_of_day': 3
    }
    
    # Badge definitions
    BADGES = {
        'first_post': {
            'name': 'Premier Post',
            'description': 'Créé votre premier topic',
            'icon': '🎯',
            'points': 10
        },
        'prolific_writer': {
            'name': 'Écrivain Prolifique',
            'description': '100 topics créés',
            'icon': '✍️',
            'points': 500
        },
        'helpful': {
            'name': 'Helpful',
            'description': '50 réponses marquées comme meilleures',
            'icon': '💡',
            'points': 300
        },
        'popular': {
            'name': 'Populaire',
            'description': '1000 likes reçus',
            'icon': '⭐',
            'points': 400
        },
        'week_streak': {
            'name': 'Semaine Parfaite',
            'description': 'Connecté 7 jours consécutifs',
            'icon': '🔥',
            'points': 100
        },
        'month_streak': {
            'name': 'Mestre de Persévérance',
            'description': 'Connecté 30 jours consécutifs',
            'icon': '🏆',
            'points': 500
        },
        'expert': {
            'name': 'Expert',
            'description': '1000 commentaires',
            'icon': '🎓',
            'points': 300
        },
        'mentor': {
            'name': 'Mentor',
            'description': '50 utilisateurs ont marqué vos réponses comme utiles',
            'icon': '🤝',
            'points': 400
        }
    }
    
    # Rank thresholds
    RANKS = [
        {'name': 'Novice', 'min_points': 0, 'icon': '🌱'},
        {'name': 'Appreni', 'min_points': 100, 'icon': '🌿'},
        {'name': 'Contributeur', 'min_points': 500, 'icon': '🌳'},
        {'name': 'Expert', 'min_points': 1000, 'icon': '🌲'},
        {'name': 'Maître', 'min_points': 2500, 'icon': '🏔️'},
        {'name': 'Légende', 'min_points': 5000, 'icon': '🌟'}
    ]
    
    @classmethod
    def get_user_rank(cls, points: int) -> Dict:
        """Get user rank based on points"""
        for rank in reversed(cls.RANKS):
            if points >= rank['min_points']:
                return rank
        return cls.RANKS[0]
    
    @classmethod
    async def add_points(cls, user_id: str, action: str, metadata: Optional[Dict] = None) -> Dict:
        """Add points to user for an action"""
        points = cls.POINT_VALUES.get(action, 0)
        
        if points == 0:
            return {'success': False, 'message': 'Invalid action'}
        
        # Get or create user gamification record
        user_gamification = await db.forum_gamification.find_one({'user_id': user_id})
        
        if not user_gamification:
            user_gamification = {
                'user_id': user_id,
                'points': 0,
                'badges': [],
                'streak_days': 0,
                'last_login_date': None,
                'stats': {
                    'topics_created': 0,
                    'comments_created': 0,
                    'likes_received': 0,
                    'best_answers': 0
                },
                'created_at': datetime.now(timezone.utc).isoformat(),
                'updated_at': datetime.now(timezone.utc).isoformat()
            }
            await db.forum_gamification.insert_one(user_gamification)
        
        # Update points
        user_gamification['points'] += points
        user_gamification['updated_at'] = datetime.now(timezone.utc).isoformat()
        
        # Update stats
        if action == 'create_topic':
            user_gamification['stats']['topics_created'] += 1
        elif action == 'create_comment':
            user_gamification['stats']['comments_created'] += 1
        elif action == 'receive_like':
            user_gamification['stats']['likes_received'] += 1
        elif action == 'receive_best_answer':
            user_gamification['stats']['best_answers'] += 1
        
        # Check for new badges
        new_badges = await cls.check_badges(user_gamification)
        user_gamification['badges'].extend(new_badges)
        
        # Update in database
        await db.forum_gamification.update_one(
            {'user_id': user_id},
            {'$set': user_gamification}
        )
        
        # Get new rank
        rank = cls.get_user_rank(user_gamification['points'])
        
        return {
            'success': True,
            'points_added': points,
            'total_points': user_gamification['points'],
            'new_badges': new_badges,
            'rank': rank
        }
    
    @classmethod
    async def check_badges(cls, user_gamification: Dict) -> List[str]:
        """Check if user qualifies for new badges"""
        new_badges = []
        existing_badges = set(user_gamification.get('badges', []))
        stats = user_gamification.get('stats', {})
        
        # Check each badge
        if 'first_post' not in existing_badges and stats.get('topics_created', 0) >= 1:
            new_badges.append('first_post')
        
        if 'prolific_writer' not in existing_badges and stats.get('topics_created', 0) >= 100:
            new_badges.append('prolific_writer')
        
        if 'helpful' not in existing_badges and stats.get('best_answers', 0) >= 50:
            new_badges.append('helpful')
        
        if 'popular' not in existing_badges and stats.get('likes_received', 0) >= 1000:
            new_badges.append('popular')
        
        if 'week_streak' not in existing_badges and user_gamification.get('streak_days', 0) >= 7:
            new_badges.append('week_streak')
        
        if 'month_streak' not in existing_badges and user_gamification.get('streak_days', 0) >= 30:
            new_badges.append('month_streak')
        
        if 'expert' not in existing_badges and stats.get('comments_created', 0) >= 1000:
            new_badges.append('expert')
        
        if 'mentor' not in existing_badges and stats.get('best_answers', 0) >= 50:
            new_badges.append('mentor')
        
        return new_badges
    
    @classmethod
    async def get_leaderboard(cls, limit: int = 10, period: str = 'all') -> List[Dict]:
        """Get leaderboard of top users"""
        # For now, return all-time leaderboard
        # TODO: Implement period filtering (weekly, monthly)
        leaderboard = await db.forum_gamification.find(
            {},
            {'_id': 0}
        ).sort('points', -1).limit(limit).to_list(limit)
        
        # Add rank and badge info
        for idx, user in enumerate(leaderboard):
            user['rank'] = idx + 1
            user['rank_info'] = cls.get_user_rank(user['points'])
            user['badge_info'] = [
                cls.BADGES[badge] for badge in user.get('badges', [])
            ]
        
        return leaderboard
    
    @classmethod
    async def get_user_gamification(cls, user_id: str) -> Optional[Dict]:
        """Get complete gamification data for a user"""
        user_gamification = await db.forum_gamification.find_one(
            {'user_id': user_id},
            {'_id': 0}
        )
        
        if not user_gamification:
            return None
        
        # Add rank info
        user_gamification['rank'] = cls.get_user_rank(user_gamification['points'])
        user_gamification['badge_info'] = [
            cls.BADGES[badge] for badge in user_gamification.get('badges', [])
        ]
        
        return user_gamification


# Global instance
gamification_engine = GamificationEngine()
