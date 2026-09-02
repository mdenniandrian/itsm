<?php

use App\Http\Controllers\Api\AssetController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\DeviceAgentController;
use App\Http\Controllers\Api\KnowledgeController;
use App\Http\Controllers\Api\KpiController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\TicketController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

// Public auth routes
Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login'])->name('login');
});

// Public Branding & Custom Theme (used by login page and frontend)
Route::get('/branding', [\App\Http\Controllers\Api\BrandingController::class, 'show']);

// Public / Token-authenticated Endpoint Agent routes (Called by Desktop PC Agent)
Route::prefix('agent')->group(function () {
    Route::post('/register', [DeviceAgentController::class, 'register']);
    Route::post('/heartbeat', [DeviceAgentController::class, 'heartbeat']);
    Route::post('/screenshot', [DeviceAgentController::class, 'uploadScreenshot']);
    Route::post('/command-result', [DeviceAgentController::class, 'commandResult']);
});

// Protected routes (Sanctum)
Route::middleware('auth:sanctum')->group(function () {
    // Auth profile
    Route::prefix('auth')->group(function () {
        Route::get('/me', [AuthController::class, 'me']);
        Route::put('/me', [AuthController::class, 'updateMe']);
        Route::put('/change-password', [AuthController::class, 'changePassword']);
        Route::post('/logout', [AuthController::class, 'logout']);
    });

    // Tickets
    Route::prefix('tickets')->group(function () {
        Route::get('/suggest/knowledge', [TicketController::class, 'suggestArticles']);
        Route::get('/', [TicketController::class, 'index']);
        Route::post('/', [TicketController::class, 'store']);
        Route::get('/{id}', [TicketController::class, 'show']);
        Route::put('/{id}', [TicketController::class, 'update']);
        Route::delete('/{id}', [TicketController::class, 'destroy']);
        Route::post('/{id}/comments', [TicketController::class, 'addComment']);
        Route::get('/{id}/history', [TicketController::class, 'history']);
        Route::post('/{id}/rate', [TicketController::class, 'rateSatisfaction']);
    });

    // Users
    Route::prefix('users')->group(function () {
        Route::get('/', [UserController::class, 'index']);
        Route::post('/', [UserController::class, 'store']);
        Route::get('/check-email', [UserController::class, 'checkEmail']);
        Route::get('/agents/list', [UserController::class, 'agents']);
        Route::get('/{id}', [UserController::class, 'show']);
        Route::put('/{id}', [UserController::class, 'update']);
        Route::put('/{id}/toggle-it-support', [UserController::class, 'toggleItSupport']);
        Route::put('/{id}/toggle-active', [UserController::class, 'toggleActive']);
        Route::get('/{id}/sessions', [UserController::class, 'sessions']);
        Route::post('/{id}/clear-sessions', [UserController::class, 'clearSessions']);
        Route::delete('/{id}/sessions/{sessionId}', [UserController::class, 'destroySession']);
        Route::post('/{id}/resend-verification', [UserController::class, 'resendVerification']);
        Route::delete('/{id}', [UserController::class, 'destroy']);
    });

    // Dashboard
    Route::prefix('dashboard')->group(function () {
        Route::get('/stats', [DashboardController::class, 'stats']);
        Route::get('/by-status', [DashboardController::class, 'byStatus']);
        Route::get('/by-priority', [DashboardController::class, 'byPriority']);
        Route::get('/by-category', [DashboardController::class, 'byCategory']);
        Route::get('/trend', [DashboardController::class, 'trend']);
        Route::get('/agent-performance', [DashboardController::class, 'agentPerformance']);
        Route::get('/recent-tickets', [DashboardController::class, 'recentTickets']);
        Route::get('/sla-breaches', [DashboardController::class, 'slaBreaches']);
    });

    // KPI Performance Monitoring
    Route::prefix('kpi')->group(function () {
        Route::get('/summary', [KpiController::class, 'summary']);
        Route::get('/trends', [KpiController::class, 'trends']);
        Route::get('/agents', [KpiController::class, 'agents']);
        Route::get('/departments', [KpiController::class, 'departments']);
    });

    // Endpoint Device Monitoring (RMM)
    Route::prefix('devices')->group(function () {
        Route::get('/', [DeviceAgentController::class, 'index']);
        Route::get('/stats/summary', [DeviceAgentController::class, 'stats']);
        Route::get('/{id}', [DeviceAgentController::class, 'show']);
        Route::get('/{id}/live-frame', [DeviceAgentController::class, 'liveFrame']);
        Route::put('/{id}', [DeviceAgentController::class, 'update']);
        Route::delete('/{id}', [DeviceAgentController::class, 'destroy']);
        Route::post('/{id}/commands', [DeviceAgentController::class, 'sendCommand']);
        Route::post('/{id}/capture-screen', [DeviceAgentController::class, 'captureScreen']);
    });

    // Notifications
    Route::prefix('notifications')->group(function () {
        Route::get('/', [NotificationController::class, 'index']);
        Route::put('/read-all', [NotificationController::class, 'markAllRead']);
        Route::put('/{id}/read', [NotificationController::class, 'markRead']);
        Route::delete('/{id}', [NotificationController::class, 'destroy']);
    });

    // Knowledge Base
    Route::prefix('knowledge')->group(function () {
        Route::get('/', [KnowledgeController::class, 'index']);
        Route::post('/', [KnowledgeController::class, 'store']);
        Route::get('/{id}', [KnowledgeController::class, 'show']);
        Route::put('/{id}', [KnowledgeController::class, 'update']);
        Route::delete('/{id}', [KnowledgeController::class, 'destroy']);
        Route::post('/{id}/helpful', [KnowledgeController::class, 'markHelpful']);
    });

    // Assets
    Route::prefix('assets')->group(function () {
        Route::get('/', [AssetController::class, 'index']);
        Route::post('/', [AssetController::class, 'store']);
        Route::get('/stats/summary', [AssetController::class, 'stats']);
        Route::get('/{id}', [AssetController::class, 'show']);
        Route::put('/{id}', [AssetController::class, 'update']);
        Route::delete('/{id}', [AssetController::class, 'destroy']);
    });

    // Add-ons & Integrations
    Route::prefix('addons')->group(function () {
        Route::get('/', [\App\Http\Controllers\Api\AddonController::class, 'index']);
        Route::get('/{key}', [\App\Http\Controllers\Api\AddonController::class, 'show']);
        Route::put('/{key}', [\App\Http\Controllers\Api\AddonController::class, 'update']);
        Route::post('/{key}/test', [\App\Http\Controllers\Api\AddonController::class, 'test']);
    });

    // Notification Templates Customizer (Email, Telegram, In-App)
    Route::prefix('notification-templates')->group(function () {
        Route::get('/', [\App\Http\Controllers\Api\NotificationTemplateController::class, 'index']);
        Route::get('/{id}', [\App\Http\Controllers\Api\NotificationTemplateController::class, 'show']);
        Route::put('/{id}', [\App\Http\Controllers\Api\NotificationTemplateController::class, 'update']);
        Route::post('/{id}/preview', [\App\Http\Controllers\Api\NotificationTemplateController::class, 'preview']);
        Route::post('/{id}/reset', [\App\Http\Controllers\Api\NotificationTemplateController::class, 'reset']);
    });

    // Branding, Theme Colors & Company Profile Settings
    Route::prefix('branding')->group(function () {
        Route::put('/', [\App\Http\Controllers\Api\BrandingController::class, 'update']);
        Route::post('/logo', [\App\Http\Controllers\Api\BrandingController::class, 'uploadLogo']);
        Route::post('/favicon', [\App\Http\Controllers\Api\BrandingController::class, 'uploadFavicon']);
        Route::post('/reset', [\App\Http\Controllers\Api\BrandingController::class, 'reset']);
    });

    // Change Management (ITIL 4)
    Route::prefix('changes')->group(function () {
        Route::get('/', [\App\Http\Controllers\Api\ChangeRequestController::class, 'index']);
        Route::get('/stats/summary', [\App\Http\Controllers\Api\ChangeRequestController::class, 'stats']);
        Route::post('/', [\App\Http\Controllers\Api\ChangeRequestController::class, 'store']);
        Route::get('/{id}', [\App\Http\Controllers\Api\ChangeRequestController::class, 'show']);
        Route::put('/{id}/status', [\App\Http\Controllers\Api\ChangeRequestController::class, 'updateStatus']);
        Route::put('/{id}/approval', [\App\Http\Controllers\Api\ChangeRequestController::class, 'decideApproval']);
    });

    // Service Catalog & Request Fulfillment
    Route::prefix('services')->group(function () {
        Route::get('/catalog', [\App\Http\Controllers\Api\ServiceCatalogController::class, 'index']);
        Route::post('/catalog', [\App\Http\Controllers\Api\ServiceCatalogController::class, 'store']);
        Route::get('/catalog/{id}', [\App\Http\Controllers\Api\ServiceCatalogController::class, 'show']);
        Route::put('/catalog/{id}', [\App\Http\Controllers\Api\ServiceCatalogController::class, 'update']);
        Route::delete('/catalog/{id}', [\App\Http\Controllers\Api\ServiceCatalogController::class, 'destroy']);
        Route::post('/request', [\App\Http\Controllers\Api\ServiceCatalogController::class, 'submitRequest']);
    });

    // Problem Management & Root Cause Analysis (RCA)
    Route::prefix('problems')->group(function () {
        Route::get('/', [\App\Http\Controllers\Api\ProblemController::class, 'index']);
        Route::get('/stats/summary', [\App\Http\Controllers\Api\ProblemController::class, 'stats']);
        Route::post('/', [\App\Http\Controllers\Api\ProblemController::class, 'store']);
        Route::get('/{id}', [\App\Http\Controllers\Api\ProblemController::class, 'show']);
        Route::put('/{id}', [\App\Http\Controllers\Api\ProblemController::class, 'update']);
        Route::post('/{id}/link-tickets', [\App\Http\Controllers\Api\ProblemController::class, 'linkTickets']);
        Route::post('/{id}/resolve-all', [\App\Http\Controllers\Api\ProblemController::class, 'resolveAllLinked']);
    });

    // Executive Reporting & Data Export
    Route::prefix('reports')->group(function () {
        Route::get('/tickets/export', [\App\Http\Controllers\Api\ReportController::class, 'exportTicketsCsv']);
        Route::get('/kpi/export', [\App\Http\Controllers\Api\ReportController::class, 'exportKpiSummary']);
    });

    // IT Diagnostics & Troubleshooting Tools
    Route::prefix('tools')->group(function () {
        Route::post('/ping', [\App\Http\Controllers\Api\ToolsController::class, 'ping']);
        Route::post('/port-check', [\App\Http\Controllers\Api\ToolsController::class, 'portCheck']);
        Route::post('/traceroute', [\App\Http\Controllers\Api\ToolsController::class, 'traceroute']);
        Route::post('/dns-lookup', [\App\Http\Controllers\Api\ToolsController::class, 'dnsLookup']);
        Route::post('/ssl-check', [\App\Http\Controllers\Api\ToolsController::class, 'sslCheck']);
        Route::post('/whois-ip', [\App\Http\Controllers\Api\ToolsController::class, 'whoisIp']);
        Route::post('/password-gen', [\App\Http\Controllers\Api\ToolsController::class, 'passwordGen']);
        Route::post('/base64-jwt', [\App\Http\Controllers\Api\ToolsController::class, 'base64Jwt']);
    });

    // Enterprise Audit & Security Logging System
    Route::prefix('audit-logs')->group(function () {
        Route::get('/', [\App\Http\Controllers\Api\AuditLogController::class, 'index']);
        Route::get('/stats/summary', [\App\Http\Controllers\Api\AuditLogController::class, 'stats']);
        Route::get('/export/csv', [\App\Http\Controllers\Api\AuditLogController::class, 'export']);
        Route::get('/{id}', [\App\Http\Controllers\Api\AuditLogController::class, 'show']);
    });
});

