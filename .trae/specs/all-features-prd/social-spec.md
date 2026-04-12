# Social Features Spec

## Why
Fitur sosial meningkatkan engagement melalui competition, collaboration, dan community. Features like leaderboards dan circles membedakan platform dari solo practice apps.

## What Changes
- Social Hub dengan Friends/Circles
- Friend System
- Circle System (group learning)
- Leaderboard (global + Mason-specific)

## Impact
- Affected specs: Dashboard, Learning Path
- Affected code: `frontend/src/components/SocialHub.tsx`, `frontend/src/services/friendService.ts`, `frontend/src/services/circleService.ts`

---

## ADDED Requirements

### Requirement: Social Hub
The system SHALL be the central hub for all social features.

#### Features Available
1. Friends list (pending + accepted)
2. Circles (my circles + discover)
3. Leaderboard
4. Friend activity feed
5. Invite friends

#### Hub Layout
1. Tab navigation
2. Quick stats
3. Recent activity
4. Quick actions

### Requirement: Friend System
The system SHALL manage social connections between users.

#### Friend Features
1. Send friend request
2. Accept/Reject request
3. View friend's progress
4. Unfriend
5. Block (optional)

#### Scenario: Send Friend Request
- **GIVEN** viewing another user's profile
- **WHEN** clicks "Add Friend"
- **THEN** request sent
- **AND** notification to recipient

#### Scenario: Accept Request
- **GIVEN** receives friend request
- **WHEN** clicks "Accept"
- **THEN** friends connected
- **AND** added to friends list

#### Scenario: Friend Activity
- **GIVEN** user is friend
- **WHEN** friend completes activity
- **THEN** shows in activity feed
- **AND** can congratulate

### Requirement: Circle System
The system SHALL enable group learning with shared progress.

#### Circle Features
1. Create circle
2. Join with code
3. Circle chat
4. Group leaderboard
5. Shared resources

#### Circle Roles
| Role | Permissions |
|------|------------|
| Owner | Manage, Remove members, Delete |
| Admin | Manage members, Pin posts |
| Member | Post, Participate |

#### Scenario: Create Circle
- **GIVEN** user creates circle
- **WHEN** name and description set
- **AND** invite code generated
- **THEN** circle created
- **AND** user is owner

#### Scenario: Join Circle
- **GIVEN** user has invite code
- **WHEN** enters code
- **THEN** join request sent
- **AND** owner notified (if private)

#### Scenario: Circle Chat
- **GIVEN** member of circle
- **WHEN** types message
- **THEN** posted to circle chat
- **AND** members see notification

#### Scenario: Circle Leaderboard
- **GIVEN** circle has members
- **WHEN** views leaderboard
- **THEN** members ranked by XP
- **AND** weekly changes shown

### Requirement: Leaderboard
The system SHALL display competitive rankings.

#### Leaderboard Types
1. **Global** - All users
2. **Mason** - Writing Gym only
3. **Circle** - Circle members
4. **Weekly** - This week only

#### Display Options
1. Top 10 visible
2. User's own rank
3. Friends nearby
4. Time period selector

#### Scenario: View Leaderboard
- **GIVEN** user opens leaderboard
- **WHEN** rankings loaded
- **THEN** show top users
- **AND** highlight user position

#### Scenario: Rank Improvement
- **GIVEN** moves up in rank
- **WHEN** leaderboard updates
- **THEN** show "You moved up!"
- **AND** confetti if top 10

---

## Social UX Requirements

### Profile Card (Friend)
1. Avatar and name
2. XP and level
3. Current streak
4. Best score
5. Quick actions

### Circle Card
1. Circle name
2. Member count
3. Weekly XP
4. My rank
5. Join/View button

### Leaderboard Row
1. Rank number
2. Avatar
3. Name
4. Score
5. Change indicator (up/down/same)

---

## Privacy & Safety

### Privacy Settings
1. Public profile (yes/no)
2. Show in leaderboard (yes/no)
3. Activity visible to (friends/all)
4. Circle visibility (public/invite)

### Safety Features
1. Report user
2. Block user
3. Circle moderation
4. Content flagging

---

## Notification Types

### Social Notifications
- Friend request received
- Friend request accepted
- Circle invite
- Circle mention
- Rank improved
- Leaderboard overtaken
- Achievement unlocked (friend)
- Streak milestone (friend)

---

## Performance Targets

- Friend list load: <1s
- Leaderboard load: <2s
- Circle chat: <500ms
- Real-time updates: WebSocket

---

## Analytics Events

- `social_friend_request` - Request sent
- `social_friend_accept` - Request accepted
- `social_friend_remove` - Removed
- `social_circle_create` - Circle created
- `social_circle_join` - Joined
- `social_circle_leave` - Left
- `social_circle_chat` - Message sent
- `leaderboard_view` - Viewed
- `leaderboard_rank_up` - Rank improved
- `leaderboard_overtake` - Overtaken