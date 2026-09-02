<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $query = User::query();

        if ($request->filled('role')) {
            $query->where('role', $request->role);
        }
        if ($request->filled('is_active')) {
            $query->where('is_active', filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN));
        }
        if ($request->filled('is_it_support')) {
            $query->where('is_it_support', filter_var($request->is_it_support, FILTER_VALIDATE_BOOLEAN));
        }
        if ($request->filled('auth_source')) {
            $query->where('auth_source', $request->auth_source);
        }
        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('name', 'like', "%{$s}%")
                  ->orWhere('email', 'like', "%{$s}%")
                  ->orWhere('department', 'like', "%{$s}%")
                  ->orWhere('it_specialty', 'like', "%{$s}%");
            });
        }

        $users = $query->orderBy('name', 'asc')->get()->map(function ($u) {
            return [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'role' => $u->role,
                'is_it_support' => (bool) $u->is_it_support,
                'it_specialty' => $u->it_specialty,
                'it_tags' => $u->it_tags ?: [],
                'auth_source' => $u->auth_source ?: 'local',
                'department' => $u->department,
                'phone' => $u->phone,
                'is_active' => (bool) $u->is_active,
                'last_login_at' => $u->last_login_at ? $u->last_login_at->toIso8601String() : null,
                'created_at' => $u->created_at ? $u->created_at->toIso8601String() : null,
            ];
        });

        return response()->json($users);
    }

    public function show($id)
    {
        $u = User::find($id);
        if (!$u) {
            return response()->json(['error' => 'User not found'], 404);
        }

        return response()->json([
            'id' => $u->id,
            'name' => $u->name,
            'email' => $u->email,
            'role' => $u->role,
            'is_it_support' => (bool) $u->is_it_support,
            'it_specialty' => $u->it_specialty,
            'it_tags' => $u->it_tags ?: [],
            'auth_source' => $u->auth_source ?: 'local',
            'department' => $u->department,
            'phone' => $u->phone,
            'is_active' => (bool) $u->is_active,
            'last_login_at' => $u->last_login_at ? $u->last_login_at->toIso8601String() : null,
            'created_at' => $u->created_at ? $u->created_at->toIso8601String() : null,
        ]);
    }

    public static function validateStrictEmail(?string $email): ?string
    {
        if (empty($email)) {
            return 'Email address is required.';
        }

        $email = strtolower(trim($email));

        // 1. Basic format
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return 'Invalid email format. Please provide a well-formed email address (e.g. user@company.com).';
        }

        $parts = explode('@', $email);
        if (count($parts) !== 2) {
            return 'Email must contain a single @ separator.';
        }

        $local = $parts[0];
        $domain = $parts[1];

        // 2. Reject short or generic dummy usernames
        if (strlen($local) < 2) {
            return 'Email username portion is too short.';
        }
        if (preg_match('/^(test|dummy|fake|asdf|qwerty|temp|sample|testing|admin123|user123)$/i', $local)) {
            return "Email username '{$local}' is recognized as a placeholder/dummy name. Please use a legitimate user email.";
        }

        // 3. Domain must contain a valid TLD
        if (!str_contains($domain, '.')) {
            return 'Email domain must contain a valid top-level domain (e.g. .com, .org, .co.id, .id).';
        }

        $domainParts = explode('.', $domain);
        $tld = end($domainParts);
        if (strlen($tld) < 2 || !preg_match('/^[a-z]{2,24}$/i', $tld)) {
            return 'Email top-level domain (TLD) is invalid.';
        }

        // 4. Blacklist of dummy / placeholder / disposable email domains
        $disposableAndDummyDomains = [
            'example.com', 'example.org', 'example.net', 'example.edu',
            'test.com', 'test.net', 'test.org', 'test.test', 'test.local',
            'dummy.com', 'fake.com', 'invalid.com', 'invalid.org', 'sample.com',
            'testing.com', 'temp.com', 'asdf.com', 'qwerty.com', 'domain.com',
            'localhost', 'local.com', 'mysite.com', 'yoursite.com',
            'mailinator.com', '10minutemail.com', 'tempmail.com', 'throwawaymail.com',
            'guerrillamail.com', 'yopmail.com', 'trashmail.com', 'sharklasers.com',
            'dispostable.com', 'getairmail.com', 'nada.ltd', 'mohmal.com', 'burnermail.io',
            'temp-mail.org', 'fakeinbox.com', 'maildrop.cc', 'inboxkitten.com'
        ];

        if (in_array($domain, $disposableAndDummyDomains, true)) {
            return "The email domain '@{$domain}' is a known dummy/disposable domain. Please use a valid corporate or recognized personal email domain (e.g., @company.com, @gmail.com, @outlook.com).";
        }

        // 5. Global DNS MX Record Verification (Mail Checker)
        $mxCheck = self::checkGlobalDnsMx($domain);
        if (!$mxCheck['has_mx']) {
            return $mxCheck['message'];
        }

        return null;
    }

    public static function checkGlobalDnsMx(string $domain): array
    {
        $domain = strtolower(trim($domain));
        if (empty($domain) || !str_contains($domain, '.')) {
            return ['has_mx' => false, 'hosts' => [], 'message' => 'Invalid domain syntax.'];
        }

        // Local testing environment bypass
        if (app()->environment('testing')) {
            return [
                'has_mx' => true,
                'hosts' => ["mail.{$domain}"],
                'primary_host' => "mail.{$domain}",
                'message' => "Mail Exchange (MX) verified.",
            ];
        }

        $mxHosts = [];
        $weights = [];

        // 1. Query MX records via getmxrr
        if (function_exists('getmxrr')) {
            @getmxrr($domain, $mxHosts, $weights);
        }

        // 2. Fallback to dns_get_record
        if (empty($mxHosts) && function_exists('dns_get_record')) {
            $records = @dns_get_record($domain, DNS_MX);
            if (!empty($records) && is_array($records)) {
                foreach ($records as $rec) {
                    if (!empty($rec['target'])) {
                        $mxHosts[] = $rec['target'];
                    }
                }
            }
        }

        // 3. Fallback: check direct DNS A / AAAA / MX records
        if (empty($mxHosts) && function_exists('checkdnsrr')) {
            if (@checkdnsrr($domain, 'MX') || @checkdnsrr($domain, 'A') || @checkdnsrr($domain, 'AAAA')) {
                $mxHosts[] = $domain;
            }
        }

        if (!empty($mxHosts)) {
            $uniqueHosts = array_values(array_unique($mxHosts));
            return [
                'has_mx' => true,
                'hosts' => $uniqueHosts,
                'primary_host' => $uniqueHosts[0],
                'message' => "Mail Server (MX) verified: " . $uniqueHosts[0],
            ];
        }

        return [
            'has_mx' => false,
            'hosts' => [],
            'message' => "Domain '@{$domain}' does not have any active Mail Server (MX) or DNS records registered in global internet DNS.",
        ];
    }

    public function checkEmail(Request $request)
    {
        $email = $request->input('email');
        $excludeUserId = $request->input('exclude_user_id');

        if (empty($email)) {
            return response()->json([
                'valid' => false,
                'available' => false,
                'message' => 'Email address is required.',
            ]);
        }

        $email = strtolower(trim($email));

        // 1. Strict real email format and dummy blacklist validation
        $error = self::validateStrictEmail($email);
        if ($error) {
            return response()->json([
                'valid' => false,
                'available' => false,
                'message' => $error,
            ]);
        }

        // 2. Check if already exists in database
        $query = User::where('email', $email);
        if ($excludeUserId) {
            $query->where('id', '!=', $excludeUserId);
        }
        $existing = $query->first();

        if ($existing) {
            return response()->json([
                'valid' => true,
                'available' => false,
                'message' => "Email '{$email}' is already in use by user '{$existing->name}'.",
            ]);
        }

        $parts = explode('@', $email);
        $domain = $parts[1] ?? '';
        $mxInfo = self::checkGlobalDnsMx($domain);

        return response()->json([
            'valid' => true,
            'available' => true,
            'domain' => $domain,
            'mx_host' => $mxInfo['primary_host'] ?? null,
            'mx_hosts' => $mxInfo['hosts'] ?? [],
            'message' => "✓ Valid & globally active mail domain (MX: " . ($mxInfo['primary_host'] ?? $domain) . ")",
        ]);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        if (!in_array($user->role, ['admin', 'manager', 'superadmin'])) {
            return response()->json(['error' => 'Access denied'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8',
            'role' => 'required|in:admin,manager,agent,user',
            'is_it_support' => 'sometimes|boolean',
            'it_specialty' => 'nullable|string|max:100',
            'it_tags' => 'nullable|array',
            'auth_source' => 'sometimes|string|in:local,ldap',
            'department' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:50',
        ]);

        if ($emailError = self::validateStrictEmail($validated['email'])) {
            return response()->json([
                'error' => $emailError,
                'message' => $emailError,
                'errors' => ['email' => [$emailError]]
            ], 422);
        }

        $isIt = $validated['is_it_support'] ?? ($validated['role'] === 'agent');
        $tags = $validated['it_tags'] ?? [];
        if ($isIt && !in_array('IT Support', $tags)) {
            $tags[] = 'IT Support';
        }

        $created = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => $validated['role'],
            'is_it_support' => $isIt,
            'it_specialty' => $validated['it_specialty'] ?? ($isIt ? 'General IT Support' : null),
            'it_tags' => $tags,
            'auth_source' => $validated['auth_source'] ?? 'local',
            'department' => $validated['department'] ?? null,
            'phone' => $validated['phone'] ?? null,
            'is_active' => true,
        ]);

        AuditLogger::logSecurity(
            'USER_CREATE',
            "Administrator {$user->name} registered new user '{$created->name}' ({$created->email}) with role '{$created->role}'.",
            $created,
            null,
            $created->only(['name', 'email', 'role', 'department', 'phone', 'is_it_support'])
        );

        // Send Account Welcome & Verification Email
        $sendEmail = filter_var($request->input('send_email', true), FILTER_VALIDATE_BOOLEAN);
        $emailStatus = null;
        if ($sendEmail) {
            $emailStatus = \App\Services\EmailNotificationService::sendUserWelcomeVerificationEmail($created, $validated['password']);
        }

        return response()->json([
            'user' => $created,
            'id' => $created->id,
            'name' => $created->name,
            'email' => $created->email,
            'role' => $created->role,
            'email_sent' => $emailStatus['success'] ?? false,
            'email_message' => $emailStatus['message'] ?? null,
            'message' => 'User account created successfully.',
        ], 201);
    }

    public function resendVerification(Request $request, $id)
    {
        $currentUser = $request->user();
        if (!in_array($currentUser->role, ['admin', 'manager', 'superadmin'])) {
            return response()->json(['error' => 'Access denied'], 403);
        }

        $u = User::find($id);
        if (!$u) {
            return response()->json(['error' => 'User not found'], 404);
        }

        $result = \App\Services\EmailNotificationService::sendUserWelcomeVerificationEmail($u);

        AuditLogger::logSecurity(
            'VERIFICATION_EMAIL_SENT',
            "Administrator {$currentUser->name} resent welcome/verification email to user '{$u->name}' ({$u->email}).",
            $u
        );

        return response()->json([
            'success' => $result['success'] ?? true,
            'message' => $result['success'] 
                ? "Account welcome & verification email successfully dispatched to {$u->email}."
                : ($result['message'] ?? "Email dispatch initiated."),
        ]);
    }

    public function update(Request $request, $id)
    {
        $currentUser = $request->user();
        if (!in_array($currentUser->role, ['admin', 'manager', 'superadmin'])) {
            return response()->json(['error' => 'Access denied'], 403);
        }

        $u = User::find($id);
        if (!$u) {
            return response()->json(['error' => 'User not found'], 404);
        }

        $oldValues = $u->only(['name', 'email', 'role', 'department', 'phone', 'is_active', 'is_it_support']);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:users,email,' . $id,
            'password' => 'nullable|string|min:8',
            'role' => 'sometimes|in:admin,manager,agent,user',
            'is_it_support' => 'sometimes|boolean',
            'it_specialty' => 'nullable|string|max:100',
            'it_tags' => 'nullable|array',
            'auth_source' => 'sometimes|string|in:local,ldap',
            'department' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:50',
            'is_active' => 'sometimes|boolean',
        ]);

        if (isset($validated['email']) && ($emailError = self::validateStrictEmail($validated['email']))) {
            return response()->json([
                'error' => $emailError,
                'message' => $emailError,
                'errors' => ['email' => [$emailError]]
            ], 422);
        }

        if (!empty($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            unset($validated['password']);
        }

        if (isset($validated['is_it_support'])) {
            $tags = $validated['it_tags'] ?? ($u->it_tags ?: []);
            if ($validated['is_it_support']) {
                if (!in_array('IT Support', $tags)) {
                    $tags[] = 'IT Support';
                }
                if ($u->role === 'user' && !isset($validated['role'])) {
                    $validated['role'] = 'agent';
                }
            } else {
                $tags = array_values(array_filter($tags, fn($t) => $t !== 'IT Support'));
                $validated['it_specialty'] = null;
                if ($u->role === 'agent' && !isset($validated['role'])) {
                    $validated['role'] = 'user';
                }
            }
            $validated['it_tags'] = array_values(array_unique($tags));
        }

        $u->update($validated);
        $newValues = $u->only(['name', 'email', 'role', 'department', 'phone', 'is_active', 'is_it_support']);

        AuditLogger::logSecurity(
            'USER_UPDATE',
            "Administrator {$currentUser->name} updated user profile for '{$u->name}' ({$u->email}).",
            $u,
            $oldValues,
            $newValues
        );

        return response()->json($u);
    }

    public function toggleItSupport(Request $request, $id)
    {
        $currentUser = $request->user();
        if (!in_array($currentUser->role, ['admin', 'manager', 'superadmin'])) {
            return response()->json(['error' => 'Access denied'], 403);
        }

        $u = User::find($id);
        if (!$u) {
            return response()->json(['error' => 'User not found'], 404);
        }

        $isIt = $request->has('is_it_support') 
            ? filter_var($request->is_it_support, FILTER_VALIDATE_BOOLEAN)
            : !$u->is_it_support;

        $specialty = $request->input('it_specialty', $u->it_specialty ?: ($isIt ? 'General IT Support' : null));
        $tags = $request->input('it_tags', $u->it_tags ?: []);

        if ($isIt) {
            if (!in_array('IT Support', $tags)) {
                $tags[] = 'IT Support';
            }
            if ($u->role === 'user') {
                $u->role = 'agent';
            }
        } else {
            $tags = array_values(array_filter($tags, fn($t) => $t !== 'IT Support'));
            if ($u->role === 'agent') {
                $u->role = 'user';
            }
        }

        $u->update([
            'is_it_support' => $isIt,
            'it_specialty' => $isIt ? $specialty : null,
            'it_tags' => array_values(array_unique($tags)),
            'role' => $u->role,
        ]);

        AuditLogger::logSecurity(
            'ROLE_PERMISSION_CHANGE',
            $isIt 
                ? "User {$u->name} designated as IT Support technician."
                : "IT Support designation removed from {$u->name}.",
            $u
        );

        return response()->json([
            'message' => $isIt 
                ? "User {$u->name} marked as IT Support ({$u->it_specialty})."
                : "IT Support tag removed from {$u->name}.",
            'user' => $u,
        ]);
    }

    public function toggleActive(Request $request, $id)
    {
        $currentUser = $request->user();
        if (!in_array($currentUser->role, ['admin', 'manager', 'superadmin'])) {
            return response()->json(['error' => 'Access denied'], 403);
        }

        if ($id == $currentUser->id) {
            return response()->json(['error' => 'You cannot deactivate your own currently active account.'], 400);
        }

        $u = User::find($id);
        if (!$u) {
            return response()->json(['error' => 'User not found'], 404);
        }

        $isActive = $request->has('is_active') 
            ? filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN)
            : !$u->is_active;

        $u->update(['is_active' => $isActive]);

        // Revoke active sessions if deactivated
        if (!$isActive) {
            $u->tokens()->delete();
        }

        AuditLogger::logSecurity(
            'STATUS_CHANGE',
            $isActive 
                ? "Administrator {$currentUser->name} activated user account '{$u->name}' ({$u->email})."
                : "Administrator {$currentUser->name} deactivated user account '{$u->name}' ({$u->email}) and revoked all active sessions.",
            $u
        );

        return response()->json([
            'message' => $isActive 
                ? "User account {$u->name} successfully activated."
                : "User account {$u->name} successfully deactivated (login access revoked).",
            'user' => $u,
            'is_active' => $isActive,
        ]);
    }

    public function destroy(Request $request, $id)
    {
        $currentUser = $request->user();
        if (!in_array($currentUser->role, ['admin', 'manager', 'superadmin'])) {
            return response()->json(['error' => 'Access denied'], 403);
        }

        if ($id == $currentUser->id) {
            return response()->json(['error' => 'You cannot delete your own currently active account.'], 400);
        }

        $u = User::find($id);
        if (!$u) {
            return response()->json(['error' => 'User not found'], 404);
        }

        // Protect primary admin from deletion
        if ($u->email === 'admin@itsm.com' || ($u->id === 1 && $u->role === 'admin')) {
            return response()->json(['error' => 'Primary Super Administrator account is protected and cannot be deleted.'], 400);
        }

        $name = $u->name;
        $email = $u->email;
        $role = $u->role;

        // Revoke tokens and delete user
        $u->tokens()->delete();
        $u->delete();

        AuditLogger::logSecurity(
            'USER_DELETE',
            "Administrator {$currentUser->name} permanently deleted user account '{$name}' ({$email}, Role: {$role}).",
            $u
        );

        return response()->json([
            'message' => "User '{$name}' ({$email}) has been permanently deleted from the system.",
        ]);
    }

    public function agents()
    {
        $agents = User::where(function($q) {
                $q->whereIn('role', ['admin', 'manager', 'agent'])
                  ->orWhere('is_it_support', true);
            })
            ->where('is_active', true)
            ->orderBy('name', 'asc')
            ->get(['id', 'name', 'email', 'role', 'is_it_support', 'it_specialty', 'it_tags', 'department']);

        return response()->json($agents);
    }

    public function sessions(Request $request, $id)
    {
        $currentUser = $request->user();
        if (!in_array($currentUser->role, ['admin', 'manager', 'superadmin'])) {
            return response()->json(['error' => 'Access denied'], 403);
        }

        $u = User::find($id);
        if (!$u) {
            return response()->json(['error' => 'User not found'], 404);
        }

        // 1. Personal access tokens
        $currentSanctumTokenId = $currentUser->id === $u->id ? $request->user()->currentAccessToken()?->id : null;
        $tokens = $u->tokens()->orderBy('last_used_at', 'desc')->get()->map(function ($t) use ($currentSanctumTokenId) {
            return [
                'id' => $t->id,
                'name' => $t->name ?: 'Web Browser Session',
                'last_used_at' => $t->last_used_at ? $t->last_used_at->toIso8601String() : null,
                'created_at' => $t->created_at ? $t->created_at->toIso8601String() : null,
                'type' => 'sanctum_token',
                'is_current' => $t->id === $currentSanctumTokenId,
            ];
        });

        // 2. Database web sessions
        $dbSessions = collect();
        if (\Illuminate\Support\Facades\Schema::hasTable('sessions')) {
            $dbSessions = \Illuminate\Support\Facades\DB::table('sessions')
                ->where('user_id', $u->id)
                ->orderBy('last_activity', 'desc')
                ->get()
                ->map(function ($s) {
                    return [
                        'id' => $s->id,
                        'ip_address' => $s->ip_address,
                        'user_agent' => $s->user_agent,
                        'last_activity' => date('c', $s->last_activity),
                        'type' => 'web_session',
                        'is_current' => false,
                    ];
                });
        }

        return response()->json([
            'user' => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'role' => $u->role,
                'is_active' => (bool) $u->is_active,
                'last_login_at' => $u->last_login_at ? $u->last_login_at->toIso8601String() : null,
            ],
            'tokens' => $tokens,
            'sessions' => $dbSessions,
            'total_active_sessions' => $tokens->count() + $dbSessions->count(),
        ]);
    }

    public function clearSessions(Request $request, $id)
    {
        $currentUser = $request->user();
        if (!in_array($currentUser->role, ['admin', 'manager', 'superadmin'])) {
            return response()->json(['error' => 'Access denied'], 403);
        }

        $u = User::find($id);
        if (!$u) {
            return response()->json(['error' => 'User not found'], 404);
        }

        $tokenCount = $u->tokens()->count();
        $sessionCount = 0;
        if (\Illuminate\Support\Facades\Schema::hasTable('sessions')) {
            $sessionCount = \Illuminate\Support\Facades\DB::table('sessions')->where('user_id', $u->id)->count();
            \Illuminate\Support\Facades\DB::table('sessions')->where('user_id', $u->id)->delete();
        }

        $u->tokens()->delete();
        $totalCleared = $tokenCount + $sessionCount;

        AuditLogger::logSecurity(
            'SESSION_REVOKE',
            "Administrator {$currentUser->name} terminated all active login sessions ({$totalCleared} session(s) revoked) for user '{$u->name}' ({$u->email}).",
            $u,
            ['active_sessions_before' => $totalCleared],
            ['active_sessions_after' => 0]
        );

        return response()->json([
            'message' => "All active login sessions ({$totalCleared}) for user '{$u->name}' have been revoked successfully. The user must log in again.",
            'cleared_count' => $totalCleared,
            'user_id' => $u->id,
        ]);
    }

    public function destroySession(Request $request, $id, $sessionId)
    {
        $currentUser = $request->user();
        if (!in_array($currentUser->role, ['admin', 'manager', 'superadmin'])) {
            return response()->json(['error' => 'Access denied'], 403);
        }

        $u = User::find($id);
        if (!$u) {
            return response()->json(['error' => 'User not found'], 404);
        }

        // Try deleting token
        $deleted = $u->tokens()->where('id', $sessionId)->delete();

        // Try deleting from database sessions
        if (!$deleted && \Illuminate\Support\Facades\Schema::hasTable('sessions')) {
            $deleted = \Illuminate\Support\Facades\DB::table('sessions')
                ->where('user_id', $u->id)
                ->where('id', $sessionId)
                ->delete();
        }

        AuditLogger::logSecurity(
            'SESSION_REVOKE',
            "Administrator {$currentUser->name} revoked session #{$sessionId} for user '{$u->name}' ({$u->email}).",
            $u
        );

        return response()->json([
            'message' => "Session successfully revoked for user '{$u->name}'.",
        ]);
    }
}
