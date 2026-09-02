<?php

namespace App\Services;

use App\Models\AddonConfig;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;

class LdapService
{
    /**
     * Test connection & Admin bind to LDAP server
     */
    public static function testConnection(array $config): array
    {
        $rawHost = $config['host'] ?? '127.0.0.1';
        $port = (int) ($config['port'] ?? 389);
        $baseDn = $config['base_dn'] ?? '';
        $bindDn = $config['bind_dn'] ?? '';
        $bindPassword = $config['bind_password'] ?? '';
        $useSsl = !empty($config['use_ssl']);

        // Clean host URL
        $cleanHost = preg_replace('#^ldaps?://#i', '', $rawHost);
        $cleanHost = explode(':', $cleanHost)[0];

        if (empty($cleanHost)) {
            return [
                'success' => false,
                'message' => 'LDAP server host is required.',
            ];
        }

        // 1. Socket Ping Test
        $socketTimeout = 4;
        $protocol = $useSsl ? 'ssl://' : '';
        $errno = 0;
        $errstr = '';

        $fp = @fsockopen($protocol . $cleanHost, $port, $errno, $errstr, $socketTimeout);
        if (!$fp) {
            return [
                'success' => false,
                'message' => "Failed to connect to host {$cleanHost}:{$port} ({$errstr})",
                'details' => [
                    'host' => $cleanHost,
                    'port' => $port,
                    'error_code' => $errno,
                    'error_str' => $errstr,
                ],
            ];
        }
        fclose($fp);

        // 2. If PHP LDAP extension is installed, try native bind
        if (function_exists('ldap_connect')) {
            $ldapUri = $useSsl ? "ldaps://{$cleanHost}:{$port}" : "ldap://{$cleanHost}:{$port}";
            $conn = @ldap_connect($ldapUri);
            if ($conn) {
                ldap_set_option($conn, LDAP_OPT_PROTOCOL_VERSION, 3);
                ldap_set_option($conn, LDAP_OPT_REFERRALS, 0);
                ldap_set_option($conn, LDAP_OPT_NETWORK_TIMEOUT, 5);

                if (!empty($bindDn)) {
                    $bind = @ldap_bind($conn, $bindDn, $bindPassword);
                    if ($bind) {
                        ldap_unbind($conn);
                        return [
                            'success' => true,
                            'message' => "LDAP connection & Admin Bind authentication to {$cleanHost}:{$port} succeeded!",
                            'details' => [
                                'host' => $cleanHost,
                                'port' => $port,
                                'bind_status' => 'Authenticated',
                                'base_dn' => $baseDn,
                            ],
                        ];
                    } else {
                        $ldapError = ldap_error($conn);
                        ldap_unbind($conn);
                        return [
                            'success' => false,
                            'message' => "Server socket is open, but Admin Bind authentication failed: {$ldapError}",
                        ];
                    }
                }

                ldap_unbind($conn);
            }
        }

        return [
            'success' => true,
            'message' => "Socket connection to LDAP server {$cleanHost}:{$port} verified successfully!",
            'details' => [
                'host' => $cleanHost,
                'port' => $port,
                'base_dn' => $baseDn,
                'socket' => 'Open',
            ],
        ];
    }

    /**
     * Authenticate a user against LDAP / Zimbra / Active Directory
     */
    public static function authenticateUser(string $loginInput, string $password): ?array
    {
        if (empty($loginInput) || empty($password)) {
            return null;
        }

        $addon = AddonConfig::where('addon_key', 'ldap')->first();
        if (!$addon || !$addon->is_enabled) {
            return null;
        }

        $config = $addon->config ?: [];
        $rawHost = $config['host'] ?? '';
        $port = (int) ($config['port'] ?? 389);
        $baseDn = $config['base_dn'] ?? '';
        $bindDn = $config['bind_dn'] ?? '';
        $bindPassword = $config['bind_password'] ?? '';
        $useSsl = !empty($config['use_ssl']);
        $userFilter = $config['user_filter'] ?? '(|(mail={username})(uid={username})(sAMAccountName={username}))';
        $defaultRole = $config['default_role'] ?? 'user';
        $autoCreate = $config['auto_create_user'] ?? true;

        $cleanHost = preg_replace('#^ldaps?://#i', '', $rawHost);
        $cleanHost = explode(':', $cleanHost)[0];

        if (empty($cleanHost) || !function_exists('ldap_connect')) {
            return null;
        }

        $ldapUri = $useSsl ? "ldaps://{$cleanHost}:{$port}" : "ldap://{$cleanHost}:{$port}";
        $conn = @ldap_connect($ldapUri);
        if (!$conn) {
            Log::warning("LDAP connection failed to {$ldapUri}");
            return null;
        }

        ldap_set_option($conn, LDAP_OPT_PROTOCOL_VERSION, 3);
        ldap_set_option($conn, LDAP_OPT_REFERRALS, 0);
        ldap_set_option($conn, LDAP_OPT_NETWORK_TIMEOUT, 5);

        // 1. Service Account Bind (or Anonymous if no bind DN)
        if (!empty($bindDn)) {
            $adminBind = @ldap_bind($conn, $bindDn, $bindPassword);
            if (!$adminBind) {
                Log::warning("LDAP Admin Bind failed for DN {$bindDn}: " . ldap_error($conn));
                ldap_unbind($conn);
                return null;
            }
        }

        // 2. Build and sanitize search filter
        $escapedInput = function_exists('ldap_escape')
            ? ldap_escape($loginInput, '', LDAP_ESCAPE_FILTER)
            : addcslashes($loginInput, ",=+<>#;\"\\*()");

        // Normalize filter: replace {username} and fix missing outer brackets if any
        $filter = str_replace('{username}', $escapedInput, $userFilter);
        $filter = trim($filter);
        if (!str_starts_with($filter, '(') || !str_ends_with($filter, ')')) {
            $filter = "({$filter})";
        }

        // 3. Search for the user in Base DN
        $search = @ldap_search($conn, $baseDn, $filter);
        if (!$search) {
            Log::warning("LDAP Search failed in base {$baseDn} with filter {$filter}: " . ldap_error($conn));
            ldap_unbind($conn);
            return null;
        }

        $entries = @ldap_get_entries($conn, $search);
        if (!$entries || $entries['count'] === 0) {
            Log::info("LDAP User not found for filter: {$filter}");
            ldap_unbind($conn);
            return null;
        }

        $userEntry = $entries[0];
        $userDn = $userEntry['dn'];

        // 4. Authenticate the User by binding with their DN and provided Password
        $userBind = @ldap_bind($conn, $userDn, $password);
        if (!$userBind) {
            Log::info("LDAP User password mismatch for DN: {$userDn}");
            ldap_unbind($conn);
            return [
                'success' => false,
                'error' => 'Incorrect LDAP / Zimbra password.',
            ];
        }

        // 5. Extract user details from LDAP attributes
        $email = $userEntry['mail'][0] ?? ($userEntry['userprincipalname'][0] ?? $loginInput);
        if (!filter_var($email, FILTER_VALIDATE_EMAIL) && filter_var($loginInput, FILTER_VALIDATE_EMAIL)) {
            $email = $loginInput;
        }

        $name = $userEntry['displayname'][0] 
            ?? ($userEntry['cn'][0] 
            ?? (isset($userEntry['givenname'][0]) ? $userEntry['givenname'][0] . ' ' . ($userEntry['sn'][0] ?? '') : explode('@', $email)[0]));
        $name = trim($name) ?: explode('@', $email)[0];

        $department = $userEntry['department'][0] ?? ($userEntry['ou'][0] ?? null);
        $phone = $userEntry['telephonenumber'][0] ?? ($userEntry['mobile'][0] ?? null);

        ldap_unbind($conn);

        // 6. Find or provision user in local database
        $user = User::where('email', $email)->first();

        $isItDept = false;
        if ($department) {
            $depLower = strtolower($department);
            $isItDept = str_contains($depLower, 'it') || str_contains($depLower, 'information technology') || str_contains($depLower, 'tech');
        }

        if ($user) {
            $updateData = [
                'name' => $name ?: $user->name,
                'department' => $department ?: $user->department,
                'phone' => $phone ?: $user->phone,
                'auth_source' => 'ldap',
                'password' => Hash::make($password), // Cache password hash for offline fallback
            ];
            $user->update($updateData);
        } elseif ($autoCreate) {
            $user = User::create([
                'name' => $name,
                'email' => $email,
                'password' => Hash::make($password),
                'role' => $defaultRole,
                'is_it_support' => $isItDept || in_array($defaultRole, ['agent', 'admin']),
                'it_specialty' => $isItDept ? 'Helpdesk Support' : null,
                'it_tags' => $isItDept ? ['LDAP User', 'IT Support'] : ['LDAP User'],
                'auth_source' => 'ldap',
                'department' => $department,
                'phone' => $phone,
                'is_active' => true,
            ]);
        } else {
            return [
                'success' => false,
                'error' => 'Account found in LDAP but not registered in ITSM system.',
            ];
        }

        return [
            'success' => true,
            'user' => $user,
        ];
    }
}
