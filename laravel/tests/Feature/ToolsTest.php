<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ToolsTest extends TestCase
{
    use RefreshDatabase;

    protected $admin;
    protected $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::firstOrCreate(
            ['email' => 'admin@itsm.com'],
            [
                'name' => 'Super Administrator',
                'password' => bcrypt('admin123'),
                'role' => 'admin',
                'is_active' => true,
            ]
        );

        $this->user = User::firstOrCreate(
            ['email' => 'user_test@itsm.com'],
            [
                'name' => 'Regular User',
                'password' => bcrypt('user123'),
                'role' => 'user',
                'is_active' => true,
            ]
        );
    }

    public function test_user_cannot_access_tools_endpoint()
    {
        $res = $this->actingAs($this->user, 'sanctum')->postJson('/api/tools/ping', [
            'host' => '1.1.1.1',
        ]);

        $res->assertStatus(403);
    }

    public function test_admin_can_ping_host()
    {
        $res = $this->actingAs($this->admin, 'sanctum')->postJson('/api/tools/ping', [
            'host' => '127.0.0.1',
            'count' => 2,
        ]);

        $res->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'host',
                'is_alive',
                'packet_loss_percent',
                'raw_output',
            ]);
    }

    public function test_admin_can_scan_ports()
    {
        $res = $this->actingAs($this->admin, 'sanctum')->postJson('/api/tools/port-check', [
            'host' => '127.0.0.1',
            'ports' => [80, 443, 8000],
        ]);

        $res->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'host',
                'results' => [
                    '*' => ['port', 'service', 'status', 'is_open'],
                ],
            ]);
    }

    public function test_admin_can_lookup_dns()
    {
        $res = $this->actingAs($this->admin, 'sanctum')->postJson('/api/tools/dns-lookup', [
            'host' => '127.0.0.1',
        ]);

        $res->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'query',
                'is_ip',
            ]);
    }

    public function test_admin_can_generate_password()
    {
        $res = $this->actingAs($this->admin, 'sanctum')->postJson('/api/tools/password-gen', [
            'length' => 20,
            'uppercase' => true,
            'lowercase' => true,
            'numbers' => true,
            'symbols' => true,
        ]);

        $res->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'password',
                'length',
                'entropy_bits',
                'strength',
                'hashes' => ['md5', 'sha256', 'sha512', 'bcrypt'],
            ]);

        $this->assertEquals(20, strlen($res->json('password')));
    }

    public function test_admin_can_inspect_base64_and_jwt()
    {
        // Test base64 encode
        $encodeRes = $this->actingAs($this->admin, 'sanctum')->postJson('/api/tools/base64-jwt', [
            'input' => 'ITSM Enterprise Security',
            'action' => 'encode',
        ]);
        $encodeRes->assertStatus(200);
        $encoded = $encodeRes->json('encoded');

        // Test base64 decode
        $decodeRes = $this->actingAs($this->admin, 'sanctum')->postJson('/api/tools/base64-jwt', [
            'input' => $encoded,
            'action' => 'decode',
        ]);
        $decodeRes->assertStatus(200);
        $this->assertEquals('ITSM Enterprise Security', $decodeRes->json('decoded'));
    }

    public function test_host_sanitization_prevents_command_injection()
    {
        $res = $this->actingAs($this->admin, 'sanctum')->postJson('/api/tools/ping', [
            'host' => '127.0.0.1; cat /etc/passwd',
        ]);

        $res->assertStatus(422);
    }
}
