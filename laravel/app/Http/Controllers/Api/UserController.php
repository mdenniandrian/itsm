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

        return response()->json($created, 201);
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
}
