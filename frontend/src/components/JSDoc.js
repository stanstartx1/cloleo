/**
 * @file JSDoc documentation for Enterprise Dashboard components
 * @module EnterpriseDashboard
 * @description This file contains JSDoc documentation for the main Enterprise Dashboard components
 */

/**
 * EnterpriseDashboard - Main dashboard component for enterprise users
 * @component
 * @param {Object} props - Component props
 * @param {Object} props.user - Current user object containing user information
 * @param {string} props.token - Authentication token for API requests
 * @returns {JSX.Element} The rendered dashboard component
 * @example
 * <EnterpriseDashboard user={userData} token={authToken} />
 */

/**
 * GamificationPointsSection - Component for displaying enterprise points and level system
 * @component
 * @param {Object} props - Component props
 * @param {Object} props.user - Current user object
 * @param {string} props.token - Authentication token
 * @returns {JSX.Element} Points and level display with progress bars
 * @example
 * <GamificationPointsSection user={user} token={token} />
 */

/**
 * LeaderboardSection - Component for displaying enterprise ranking and comparison
 * @component
 * @param {Object} props - Component props
 * @param {Object} props.user - Current user object
 * @param {string} props.token - Authentication token
 * @returns {JSX.Element} Leaderboard with top 10 enterprises and comparison stats
 * @example
 * <LeaderboardSection user={user} token={token} />
 */

/**
 * AdvancedAnalyticsSection - Component for displaying advanced analytics
 * @component
 * @param {Object} props - Component props
 * @param {Object} props.user - Current user object
 * @param {string} props.token - Authentication token
 * @returns {JSX.Element} Analytics with 12-month charts, cohort analysis, and category performance
 * @example
 * <AdvancedAnalyticsSection user={user} token={token} />
 */

/**
 * CustomKPIsSection - Component for managing custom KPIs
 * @component
 * @param {Object} props - Component props
 * @param {Object} props.user - Current user object
 * @param {string} props.token - Authentication token
 * @returns {JSX.Element} KPI management interface with CRUD operations
 * @example
 * <CustomKPIsSection user={user} token={token} />
 */

/**
 * EnhancedOffersSection - Enhanced offers section with advanced negotiation
 * @component
 * @param {Object} props - Component props
 * @param {Array} props.offers - Array of offer objects
 * @param {boolean} props.loading - Loading state
 * @param {Function} props.onRefresh - Function to refresh offers
 * @param {Function} props.onAccept - Function to accept an offer
 * @param {Function} props.onReject - Function to reject an offer
 * @param {Function} props.onCounter - Function to make a counter-offer
 * @param {Function} props.onWithdraw - Function to withdraw an offer
 * @param {Function} props.onCopyLink - Function to copy offer link
 * @param {string} props.token - Authentication token
 * @param {Function} props.formatPrice - Function to format prices
 * @returns {JSX.Element} Enhanced offers interface with AI-powered negotiation suggestions
 * @example
 * <EnhancedOffersSection 
 *   offers={offers}
 *   loading={loading}
 *   onRefresh={refresh}
 *   onAccept={accept}
 *   onReject={reject}
 *   onCounter={counter}
 *   onWithdraw={withdraw}
 *   onCopyLink={copyLink}
 *   token={token}
 *   formatPrice={formatPrice}
 * />
 */

/**
 * EnhancedMessagesSection - Enhanced messages section with unread notifications
 * @component
 * @param {Object} props - Component props
 * @param {string} props.token - Authentication token
 * @param {string} props.userType - Type of user (enterprise, vendor, etc.)
 * @returns {JSX.Element} Messages interface with unread count and real-time updates
 * @example
 * <EnhancedMessagesSection token={token} userType="enterprise" />
 */

/**
 * EnhancedForumSection - Enhanced forum section with recent posts
 * @component
 * @param {Object} props - Component props
 * @param {string} props.token - Authentication token
 * @param {string} props.userType - Type of user
 * @returns {JSX.Element} Forum interface with trending posts and search/filter
 * @example
 * <EnhancedForumSection token={token} userType="enterprise" />
 */

/**
 * EnhancedTrackingSection - Enhanced tracking section with interactive map
 * @component
 * @param {Object} props - Component props
 * @param {Array} props.orders - Array of order objects
 * @param {Object} props.selectedOrder - Currently selected order
 * @param {Function} props.onSelectOrder - Function to select an order
 * @param {Object} props.driverLocation - Current driver location
 * @param {Function} props.onSetDriverLocation - Function to set driver location
 * @param {string} props.token - Authentication token
 * @returns {JSX.Element} Tracking interface with map and driver info
 * @example
 * <EnhancedTrackingSection 
 *   orders={orders}
 *   selectedOrder={selectedOrder}
 *   onSelectOrder={selectOrder}
 *   driverLocation={driverLocation}
 *   onSetDriverLocation={setDriverLocation}
 *   token={token}
 * />
 */

/**
 * AdvancedSettingsSection - Advanced settings with notifications, schedules, teams
 * @component
 * @param {Object} props - Component props
 * @param {Object} props.user - Current user object
 * @param {string} props.token - Authentication token
 * @param {Function} props.onRefresh - Function to refresh user data
 * @returns {JSX.Element} Settings interface with notification, schedule, and team management
 * @example
 * <AdvancedSettingsSection user={user} token={token} onRefresh={refresh} />
 */

/**
 * AuditTrailSection - Component for displaying audit trail of modifications
 * @component
 * @param {Object} props - Component props
 * @param {Object} props.user - Current user object
 * @param {string} props.token - Authentication token
 * @returns {JSX.Element} Audit trail with search, filter, and export capabilities
 * @example
 * <AuditTrailSection user={user} token={token} />
 */

/**
 * @typedef {Object} Achievement
 * @property {number} id - Achievement ID
 * @property {string} title - Achievement title
 * @property {string} description - Achievement description
 * @property {number} progress - Progress percentage (0-100)
 * @property {string} icon - Icon emoji
 * @property {number} target_value - Target value for achievement
 */

/**
 * @typedef {Object} Trophy
 * @property {number} id - Trophy ID
 * @property {string} name - Trophy name
 * @property {string} description - Trophy description
 * @property {string} icon - Icon emoji
 * @property {string} category - Trophy category
 * @property {number} points - Points awarded
 */

/**
 * @typedef {Object} Certificate
 * @property {number} id - Certificate ID
 * @property {string} name - Certificate name
 * @property {string} description - Certificate description
 * @property {string} icon - Icon emoji
 * @property {string} issuer - Issuing organization
 * @property {string} date - Issue date
 * @property {string} expiry_date - Expiry date
 */

/**
 * @typedef {Object} KPIMetric
 * @property {number} id - KPI ID
 * @property {string} name - KPI name
 * @property {string} formula - Calculation formula
 * @property {string} unit - Unit of measurement
 * @property {number} target - Target value
 * @property {number} current - Current value
 * @property {string} trend - Trend direction (up, down, stable)
 */

/**
 * @typedef {Object} AuditLog
 * @property {number} id - Log ID
 * @property {string} action - Action type (create, update, delete)
 * @property {string} entity - Entity type
 * @property {number} entityId - Entity ID
 * @property {Object} changes - Changes made
 * @property {string} user - User who performed action
 * @property {string} timestamp - Timestamp of action
 * @property {string} ip - IP address of user
 */
