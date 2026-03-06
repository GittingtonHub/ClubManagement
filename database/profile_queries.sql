USE ClubManagementDB;

-- ============================================
-- 1. GET USER PROFILE INFORMATION
-- ============================================
-- Returns basic user information for profile page

SELECT
    id,
    email,
    username,
    privilege,
    profile_image,
    bio,
    created_at
FROM users
WHERE id = ?;



-- ============================================
-- 2. GET USER RESERVATIONS WITH TIME GROUPING
-- ============================================
-- Groups reservations as: past / today / future
-- Used by the profile page to organize reservation history

SELECT
    r.reservation_id,
    r.resource_id,
    r.service_type,
    r.status,
    r.start_time,
    r.end_time,
    res.name AS resource_name,
    res.type AS resource_type,

    CASE
        WHEN r.end_time < NOW() THEN 'past'
        WHEN DATE(r.start_time) = CURDATE() THEN 'today'
        ELSE 'future'
    END AS reservation_group

FROM reservations r
JOIN resources res ON r.resource_id = res.id

WHERE r.user_id = ?

ORDER BY r.start_time DESC;



-- ============================================
-- 3. PROFILE METRICS
-- ============================================
-- Used to generate profile statistics

SELECT
    COUNT(*) AS total_reservations,

    SUM(
        CASE 
            WHEN r.end_time < NOW() THEN 1 
            ELSE 0 
        END
    ) AS past_reservations,

    SUM(
        CASE 
            WHEN DATE(r.start_time) = CURDATE() THEN 1 
            ELSE 0 
        END
    ) AS today_reservations,

    SUM(
        CASE 
            WHEN r.start_time > NOW() THEN 1 
            ELSE 0 
        END
    ) AS upcoming_reservations

FROM reservations r

WHERE r.user_id = ?;



-- ============================================
-- 4. OPTIONAL: USER ACTIVITY SUMMARY
-- ============================================
-- Helpful for dashboards / analytics

SELECT
    r.service_type,
    COUNT(*) AS reservation_count

FROM reservations r

WHERE r.user_id = ?

GROUP BY r.service_type

ORDER BY reservation_count DESC;