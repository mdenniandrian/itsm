<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ToolsController extends Controller
{
    /**
     * Verify agent/admin role access for diagnostic tools
     */
    private function checkAccess(Request $request): ?JsonResponse
    {
        $role = $request->user()->role ?? 'user';
        if (!in_array($role, ['admin', 'manager', 'agent'])) {
            return response()->json([
                'success' => false,
                'error' => 'Access denied. IT Diagnostic Tools can only be accessed by IT Staff and Administrators.',
            ], 403);
        }
        return null;
    }

    /**
     * Clean and validate host/IP to prevent command injection
     */
    private function sanitizeHost(string $host): ?string
    {
        $host = trim($host);
        // Remove protocols if user pasted https://
        $host = preg_replace('#^https?://#', '', $host);
        $host = explode('/', $host)[0];
        $host = explode(':', $host)[0];

        if (filter_var($host, FILTER_VALIDATE_IP)) {
            return $host;
        }

        // Domain validation
        if (preg_match('/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/', $host)) {
            return $host;
        }

        return null;
    }

    /**
     * 1. Ping & Latency Tester
     */
    public function ping(Request $request): JsonResponse
    {
        if ($deny = $this->checkAccess($request)) return $deny;

        $request->validate([
            'host' => 'required|string|max:255',
            'count' => 'nullable|integer|min:1|max:6',
        ]);

        $host = $this->sanitizeHost($request->input('host'));
        if (!$host) {
            return response()->json(['success' => false, 'error' => 'Invalid IP address or Hostname format.'], 422);
        }

        $count = (int)($request->input('count', 4));
        $escapedHost = escapeshellarg($host);

        $startTime = microtime(true);
        $isWindows = strtoupper(substr(PHP_OS, 0, 3)) === 'WIN';
        $cmd = $isWindows 
            ? "ping -n {$count} {$escapedHost}" 
            : "ping -c {$count} -t 4 {$escapedHost}";

        $output = [];
        $returnCode = 0;
        @exec($cmd, $output, $returnCode);
        $executionTime = round((microtime(true) - $startTime) * 1000, 2);

        $rawOutput = implode("\n", $output);
        $isAlive = ($returnCode === 0);

        // Parse metrics
        $packetLoss = 100;
        $avgRtt = null;
        $minRtt = null;
        $maxRtt = null;

        if (preg_match('/(\d+)% packet loss/i', $rawOutput, $m)) {
            $packetLoss = (int)$m[1];
        }

        if (preg_match('/min\/avg\/max[^\=]*=\s*([\d\.]+)\/([\d\.]+)\/([\d\.]+)/i', $rawOutput, $m)) {
            $minRtt = (float)$m[1];
            $avgRtt = (float)$m[2];
            $maxRtt = (float)$m[3];
        } elseif (preg_match('/Average\s*=\s*(\d+)ms/i', $rawOutput, $m)) {
            $avgRtt = (float)$m[1];
        }

        return response()->json([
            'success' => true,
            'host' => $host,
            'is_alive' => $isAlive,
            'packet_loss_percent' => $packetLoss,
            'avg_latency_ms' => $avgRtt,
            'min_latency_ms' => $minRtt,
            'max_latency_ms' => $maxRtt,
            'execution_time_ms' => $executionTime,
            'raw_output' => $rawOutput,
        ]);
    }

    /**
     * 2. Port & Service Availability Scanner
     */
    public function portCheck(Request $request): JsonResponse
    {
        if ($deny = $this->checkAccess($request)) return $deny;

        $request->validate([
            'host' => 'required|string|max:255',
            'ports' => 'nullable|array',
            'ports.*' => 'integer|min:1|max:65535',
            'port' => 'nullable|integer|min:1|max:65535',
        ]);

        $host = $this->sanitizeHost($request->input('host'));
        if (!$host) {
            return response()->json(['success' => false, 'error' => 'Invalid IP address or Hostname format.'], 422);
        }

        $commonServices = [
            21 => 'FTP',
            22 => 'SSH Remote Login',
            25 => 'SMTP Mail',
            53 => 'DNS Service',
            80 => 'HTTP Web Server',
            110 => 'POP3 Mail',
            143 => 'IMAP Mail',
            443 => 'HTTPS Secure Web',
            445 => 'SMB / File Sharing',
            465 => 'SMTPS Secure Mail',
            587 => 'SMTP Submission',
            993 => 'IMAPS Secure',
            1433 => 'Microsoft SQL Server',
            3306 => 'MySQL Database',
            3389 => 'RDP Remote Desktop',
            5432 => 'PostgreSQL Database',
            6379 => 'Redis Cache',
            8080 => 'HTTP Alternate / Proxy',
            8443 => 'HTTPS Alternate',
            9200 => 'Elasticsearch',
            27017 => 'MongoDB Database',
        ];

        $portsToCheck = $request->input('ports', []);
        if ($singlePort = $request->input('port')) {
            $portsToCheck = [(int)$singlePort];
        }

        if (empty($portsToCheck)) {
            $portsToCheck = [80, 443, 22, 3389, 3306, 5432, 587, 8080];
        }

        $results = [];
        foreach (array_slice($portsToCheck, 0, 15) as $port) {
            $start = microtime(true);
            $errno = 0;
            $errstr = '';
            
            // Timeout 2 seconds per port
            $fp = @fsockopen($host, $port, $errno, $errstr, 2.0);
            $rtt = round((microtime(true) - $start) * 1000, 1);

            $isOpen = is_resource($fp);
            if ($isOpen) {
                fclose($fp);
            }

            $results[] = [
                'port' => $port,
                'service' => $commonServices[$port] ?? 'Custom Port',
                'status' => $isOpen ? 'open' : 'closed',
                'is_open' => $isOpen,
                'latency_ms' => $isOpen ? $rtt : null,
                'error' => $isOpen ? null : ($errstr ?: 'Connection timed out / filtered by firewall'),
            ];
        }

        return response()->json([
            'success' => true,
            'host' => $host,
            'results' => $results,
        ]);
    }

    /**
     * 3. Traceroute & Path Tracing
     */
    public function traceroute(Request $request): JsonResponse
    {
        if ($deny = $this->checkAccess($request)) return $deny;

        $request->validate(['host' => 'required|string|max:255']);

        $host = $this->sanitizeHost($request->input('host'));
        if (!$host) {
            return response()->json(['success' => false, 'error' => 'Invalid IP address or Hostname format.'], 422);
        }

        $escapedHost = escapeshellarg($host);
        $isWindows = strtoupper(substr(PHP_OS, 0, 3)) === 'WIN';
        $cmd = $isWindows 
            ? "tracert -d -h 15 -w 1000 {$escapedHost}" 
            : "traceroute -m 15 -w 2 -q 1 {$escapedHost} 2>&1";

        $output = [];
        $returnCode = 0;
        @exec($cmd, $output, $returnCode);

        $hops = [];
        foreach ($output as $line) {
            $line = trim($line);
            if (preg_match('/^(\d+)\s+([a-zA-Z0-9\.\*\:\-]+)\s+(.*)$/', $line, $m)) {
                $hops[] = [
                    'hop' => (int)$m[1],
                    'host' => $m[2],
                    'details' => $m[3],
                ];
            }
        }

        return response()->json([
            'success' => true,
            'host' => $host,
            'hops' => $hops,
            'raw_output' => implode("\n", $output),
        ]);
    }

    /**
     * 4. DNS Record Lookup & Reverse DNS
     */
    public function dnsLookup(Request $request): JsonResponse
    {
        if ($deny = $this->checkAccess($request)) return $deny;

        $request->validate([
            'host' => 'required|string|max:255',
            'type' => 'nullable|string|in:ANY,A,AAAA,CNAME,MX,TXT,NS,SOA,PTR',
        ]);

        $rawHost = trim($request->input('host'));
        $host = $this->sanitizeHost($rawHost);
        if (!$host) {
            return response()->json(['success' => false, 'error' => 'Invalid domain or IP address format.'], 422);
        }

        $isIp = filter_var($host, FILTER_VALIDATE_IP);
        $reverseDns = null;
        if ($isIp) {
            $reverseDns = @gethostbyaddr($host);
        }

        $records = [];
        if (!$isIp && function_exists('dns_get_record')) {
            $dnsTypes = [
                'A' => DNS_A,
                'AAAA' => DNS_AAAA,
                'CNAME' => DNS_CNAME,
                'MX' => DNS_MX,
                'TXT' => DNS_TXT,
                'NS' => DNS_NS,
                'SOA' => DNS_SOA,
            ];

            $typeParam = strtoupper($request->input('type', 'ANY'));
            $bitmask = ($typeParam !== 'ANY' && isset($dnsTypes[$typeParam])) ? $dnsTypes[$typeParam] : DNS_ALL;

            $res = @dns_get_record($host, $bitmask);
            if (is_array($res)) {
                $records = array_map(function ($r) {
                    return [
                        'host' => $r['host'] ?? '',
                        'type' => $r['type'] ?? '',
                        'ttl' => $r['ttl'] ?? 0,
                        'target' => $r['target'] ?? $r['ip'] ?? $r['ipv6'] ?? ($r['txt'] ?? ($r['mname'] ?? '')),
                        'pri' => $r['pri'] ?? null,
                    ];
                }, $res);
            }
        }

        return response()->json([
            'success' => true,
            'query' => $host,
            'is_ip' => (bool)$isIp,
            'reverse_dns' => $reverseDns,
            'total_records' => count($records),
            'records' => $records,
        ]);
    }

    /**
     * 5. SSL / TLS Certificate Inspector
     */
    public function sslCheck(Request $request): JsonResponse
    {
        if ($deny = $this->checkAccess($request)) return $deny;

        $request->validate(['host' => 'required|string|max:255']);

        $host = $this->sanitizeHost($request->input('host'));
        if (!$host) {
            return response()->json(['success' => false, 'error' => 'Invalid domain format.'], 422);
        }

        $context = stream_context_create([
            'ssl' => [
                'capture_peer_cert' => true,
                'verify_peer' => false,
                'verify_peer_name' => false,
            ],
        ]);

        $timeout = 5;
        $client = @stream_socket_client("ssl://{$host}:443", $errno, $errstr, $timeout, STREAM_CLIENT_CONNECT, $context);

        if (!$client) {
            return response()->json([
                'success' => false,
                'error' => "Failed to connect to SSL port 443 on {$host}: " . ($errstr ?: 'Connection refused / SSL unsupported'),
            ], 422);
        }

        $params = stream_context_get_params($client);
        fclose($client);

        if (empty($params['options']['ssl']['peer_certificate'])) {
            return response()->json(['success' => false, 'error' => 'SSL certificate not found on server.'], 422);
        }

        $cert = openssl_x509_parse($params['options']['ssl']['peer_certificate']);
        if (!$cert) {
            return response()->json(['success' => false, 'error' => 'Failed to parse SSL certificate format.'], 422);
        }

        $validFrom = isset($cert['validFrom_time_t']) ? date('Y-m-d H:i:s', $cert['validFrom_time_t']) : '-';
        $validTo = isset($cert['validTo_time_t']) ? date('Y-m-d H:i:s', $cert['validTo_time_t']) : '-';
        $daysRemaining = isset($cert['validTo_time_t']) ? round(($cert['validTo_time_t'] - time()) / 86400) : 0;
        $isExpired = $daysRemaining < 0;

        return response()->json([
            'success' => true,
            'host' => $host,
            'is_valid' => !$isExpired,
            'is_expired' => $isExpired,
            'days_remaining' => $daysRemaining,
            'common_name' => $cert['subject']['CN'] ?? $host,
            'issuer' => $cert['issuer']['O'] ?? ($cert['issuer']['CN'] ?? 'Unknown Issuer'),
            'issuer_cn' => $cert['issuer']['CN'] ?? '',
            'valid_from' => $validFrom,
            'valid_to' => $validTo,
            'signature_algorithm' => $cert['signatureTypeSN'] ?? 'RSA-SHA256',
            'sans' => isset($cert['extensions']['subjectAltName']) ? explode(', ', $cert['extensions']['subjectAltName']) : [],
        ]);
    }

    /**
     * 6. Whois & IP Geolocation Lookup
     */
    public function whoisIp(Request $request): JsonResponse
    {
        if ($deny = $this->checkAccess($request)) return $deny;

        $request->validate(['query' => 'required|string|max:255']);

        $query = $this->sanitizeHost($request->input('query'));
        if (!$query) {
            return response()->json(['success' => false, 'error' => 'Invalid IP or Domain query format.'], 422);
        }

        $ip = filter_var($query, FILTER_VALIDATE_IP) ? $query : @gethostbyname($query);
        $reverseDns = @gethostbyaddr($ip);

        // Fetch IP details via free lookup if reachable
        $geoData = [];
        try {
            $ch = curl_init("http://ip-api.com/json/{$ip}?fields=status,message,country,countryCode,regionName,city,zip,lat,lon,timezone,isp,org,as,query");
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 3);
            $res = curl_exec($ch);
            curl_close($ch);
            if ($res) {
                $geoData = json_decode($res, true) ?: [];
            }
        } catch (\Throwable $e) {}

        return response()->json([
            'success' => true,
            'query' => $query,
            'resolved_ip' => $ip,
            'reverse_dns' => $reverseDns,
            'country' => $geoData['country'] ?? 'Unknown',
            'city' => $geoData['city'] ?? 'Unknown',
            'region' => $geoData['regionName'] ?? '',
            'isp' => $geoData['isp'] ?? 'Unknown ISP',
            'org' => $geoData['org'] ?? '',
            'as' => $geoData['as'] ?? '',
            'timezone' => $geoData['timezone'] ?? '',
        ]);
    }

    /**
     * 7. Cryptographic Password Generator & Hash Verifier
     */
    public function passwordGen(Request $request): JsonResponse
    {
        if ($deny = $this->checkAccess($request)) return $deny;

        $length = min(max((int)$request->input('length', 16), 8), 64);
        $useUpper = $request->boolean('uppercase', true);
        $useLower = $request->boolean('lowercase', true);
        $useNumbers = $request->boolean('numbers', true);
        $useSymbols = $request->boolean('symbols', true);

        $lowerSet = 'abcdefghijklmnopqrstuvwxyz';
        $upperSet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        $numSet = '0123456789';
        $symSet = '!@#$%^&*()_+-=[]{}|;:,.<>?';

        $pool = '';
        $guaranteed = '';

        if ($useLower) { $pool .= $lowerSet; $guaranteed .= $lowerSet[random_int(0, strlen($lowerSet) - 1)]; }
        if ($useUpper) { $pool .= $upperSet; $guaranteed .= $upperSet[random_int(0, strlen($upperSet) - 1)]; }
        if ($useNumbers) { $pool .= $numSet; $guaranteed .= $numSet[random_int(0, strlen($numSet) - 1)]; }
        if ($useSymbols) { $pool .= $symSet; $guaranteed .= $symSet[random_int(0, strlen($symSet) - 1)]; }

        if (empty($pool)) {
            $pool = $lowerSet . $numSet;
        }

        $password = $guaranteed;
        $remaining = $length - strlen($guaranteed);
        for ($i = 0; $i < $remaining; $i++) {
            $password .= $pool[random_int(0, strlen($pool) - 1)];
        }
        $password = str_shuffle($password);

        // Calculate Entropy
        $poolSize = strlen(count_chars($pool, 3));
        $entropy = round($length * log($poolSize, 2));
        $strength = $entropy >= 80 ? 'Very Strong (Enterprise)' : ($entropy >= 60 ? 'Strong' : ($entropy >= 40 ? 'Moderate' : 'Weak'));

        // Hashes
        $hashes = [
            'md5' => md5($password),
            'sha256' => hash('sha256', $password),
            'sha512' => hash('sha512', $password),
            'bcrypt' => password_hash($password, PASSWORD_BCRYPT),
        ];

        return response()->json([
            'success' => true,
            'password' => $password,
            'length' => $length,
            'entropy_bits' => $entropy,
            'strength' => $strength,
            'hashes' => $hashes,
        ]);
    }

    /**
     * 8. Base64 & JWT Inspector
     */
    public function base64Jwt(Request $request): JsonResponse
    {
        if ($deny = $this->checkAccess($request)) return $deny;

        $input = trim($request->input('input', ''));
        if (!$input) {
            return response()->json(['success' => false, 'error' => 'Input string cannot be empty.'], 422);
        }

        $action = $request->input('action', 'inspect'); // inspect, encode, decode

        if ($action === 'encode') {
            return response()->json([
                'success' => true,
                'encoded' => base64_encode($input),
            ]);
        }

        if ($action === 'decode') {
            $decoded = @base64_decode($input, true);
            return response()->json([
                'success' => true,
                'decoded' => $decoded !== false ? $decoded : 'Not a valid Base64 string.',
            ]);
        }

        // Automatic JWT Inspector
        $parts = explode('.', $input);
        if (count($parts) === 3) {
            $headerJson = @base64_decode(str_replace(['-', '_'], ['+', '/'], $parts[0]));
            $payloadJson = @base64_decode(str_replace(['-', '_'], ['+', '/'], $parts[1]));

            $header = json_decode($headerJson, true);
            $payload = json_decode($payloadJson, true);

            if ($header && $payload) {
                $issuedAt = isset($payload['iat']) ? date('Y-m-d H:i:s', $payload['iat']) : null;
                $expiresAt = isset($payload['exp']) ? date('Y-m-d H:i:s', $payload['exp']) : null;
                $isExpired = isset($payload['exp']) ? ($payload['exp'] < time()) : null;

                return response()->json([
                    'success' => true,
                    'type' => 'jwt',
                    'header' => $header,
                    'payload' => $payload,
                    'issued_at' => $issuedAt,
                    'expires_at' => $expiresAt,
                    'is_expired' => $isExpired,
                    'signature_algorithm' => $header['alg'] ?? 'Unknown',
                ]);
            }
        }

        // Standard Base64 decode fallback
        $decoded = @base64_decode($input, true);
        return response()->json([
            'success' => true,
            'type' => 'base64',
            'decoded' => $decoded !== false ? $decoded : 'Not a valid Base64 string.',
        ]);
    }
}
