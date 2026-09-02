<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AuditLogger;
use App\Services\LdapService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|string',
            'password' => 'required',
        ]);

        $loginInput = trim($request->input('email'));
        $password = $request->input('password');

        // 1. Try LDAP / Active Directory / Zimbra Authentication first if enabled
        $ldapResult = LdapService::authenticateUser($loginInput, $password);
        if ($ldapResult && !empty($ldapResult['success'])) {
            $user = $ldapResult['user'];

            if (!$user->is_active) {
                AuditLogger::logAuth('FAILED_LOGIN', "LDAP login blocked for deactivated account '{$user->email}'.", 'warning', $user, $request);
                return response()->json(['error' => 'Account is disabled. Please contact your system administrator.'], 403);
            }

            $user->update(['last_login_at' => now()]);

            $token = $user->createToken('auth-token')->plainTextToken;

            AuditLogger::logAuth('LOGIN', "User {$user->name} ({$user->email}) logged in successfully via LDAP directory.", 'success', $user, $request);

            return response()->json([
                'token' => $token,
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role,
                    'department' => $user->department,
                    'phone' => $user->phone,
                ]
            ]);
        }

        // 2. Fallback to Local Database Authentication
        $user = User::where('email', $loginInput)->first();

        if (!$user || !Hash::check($password, $user->password)) {
            $errorMsg = ($ldapResult && !empty($ldapResult['error']))
                ? $ldapResult['error']
                : 'Invalid email address or password';

            AuditLogger::logAuth('FAILED_LOGIN', "Failed login attempt for identifier '{$loginInput}' from IP {$request->ip()}.", 'failed', $user, $request);

            return response()->json(['error' => $errorMsg], 401);
        }

        if (!$user->is_active) {
            AuditLogger::logAuth('FAILED_LOGIN', "Login blocked for deactivated account '{$user->email}'.", 'warning', $user, $request);
            return response()->json(['error' => 'Account is disabled. Please contact your system administrator.'], 403);
        }

        $user->update(['last_login_at' => now()]);

        $token = $user->createToken('auth-token')->plainTextToken;

        AuditLogger::logAuth('LOGIN', "User {$user->name} ({$user->email}) signed in successfully.", 'success', $user, $request);

        return response()->json([
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'department' => $user->department,
                'phone' => $user->phone,
            ]
        ]);
    }

    public function me(Request $request)
    {
        $user = $request->user();
        return response()->json([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'department' => $user->department,
            'phone' => $user->phone,
            'is_active' => $user->is_active,
            'created_at' => $user->created_at,
        ]);
    }

    public function updateMe(Request $request)
    {
        $user = $request->user();
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'department' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:50',
        ]);

        $old = $user->only(['name', 'department', 'phone']);
        $user->update($validated);
        $new = $user->only(['name', 'department', 'phone']);

        AuditLogger::logSecurity('PROFILE_UPDATE', "User {$user->name} updated their personal profile.", $user, $old, $new);

        return response()->json([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'department' => $user->department,
            'phone' => $user->phone,
        ]);
    }

    public function changePassword(Request $request)
    {
        $request->validate([
            'current_password' => 'required',
            'new_password' => 'required|min:8',
        ]);

        $user = $request->user();

        if (!Hash::check($request->current_password, $user->password)) {
            AuditLogger::logSecurity('PASSWORD_CHANGE_FAILED', "Failed password change attempt: Incorrect current password.", $user);
            return response()->json(['error' => 'Current password is incorrect'], 400);
        }

        $user->update([
            'password' => Hash::make($request->new_password)
        ]);

        AuditLogger::logSecurity('PASSWORD_CHANGE', "User {$user->name} successfully changed their account password.", $user);

        return response()->json(['message' => 'Password updated successfully']);
    }

    public function logout(Request $request)
    {
        $user = $request->user();
        if ($user) {
            AuditLogger::logAuth('LOGOUT', "User {$user->name} ({$user->email}) logged out.", 'success', $user, $request);
            $user->currentAccessToken()->delete();
        }
        return response()->json(['message' => 'Logged out successfully']);
    }
}
