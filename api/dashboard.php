<?php
/**
 * Dashboard API Endpoint
 * GET ?action=stats — dashboard statistics
 */

$action = $_GET['action'] ?? 'stats';
$currentUser = require_auth();
$userModel = new User();
$branchModel = new Branch();

// Non-admin only sees their branch data
$branchFilter = ($currentUser['role'] !== 'admin' && $currentUser['branch_id'])
    ? (int) $currentUser['branch_id']
    : null;

switch ($action) {
    case 'stats':
        $stats = [
            'totalUsers'    => $userModel->count($branchFilter),
            'activeUsers'   => $userModel->countByStatus('active', $branchFilter),
            'inactiveUsers' => $userModel->countByStatus('inactive', $branchFilter),
            'newThisMonth'  => $userModel->countNewThisMonth($branchFilter),
            'roleStats'     => $userModel->countByRole($branchFilter),
            'activities'    => get_recent_activities(8, $branchFilter),
            'totalBranches' => $branchModel->count(),
        ];

        // Admin gets branch overview
        if ($currentUser['role'] === 'admin') {
            $stats['branches'] = $branchModel->findAll();
        }

        json_response(['success' => true, 'stats' => $stats]);
        break;

    default:
        json_error('Dashboard action not found.', 404);
}
