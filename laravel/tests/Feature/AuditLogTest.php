<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuditLogTest extends TestCase
{
    use RefreshDatabase;

    public function test_successful_login_records_audit_log(): void
    {
        $user = User::factory()->create([
            'email' => 'tech@company.com',
            'password' => bcrypt('Password123!'),
            'role' => 'agent',
            'is_active' => true,
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email' => 'tech@company.com',
            'password' => 'Password123!',
        ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $user->id,
            'category' => 'auth',
            'action' => 'LOGIN',
            'status' => 'success',
        ]);
    }

    public function test_failed_login_records_audit_log(): void
    {
        $response = $this->postJson('/api/auth/login', [
            'email' => 'nonexistent@company.com',
            'password' => 'WrongPassword123!',
        ]);

        $response->assertStatus(401);

        $this->assertDatabaseHas('audit_logs', [
            'category' => 'auth',
            'action' => 'FAILED_LOGIN',
            'status' => 'failed',
        ]);
    }

    public function test_user_creation_and_deactivation_records_audit_logs(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'is_active' => true]);

        // Create new user
        $res = $this->actingAs($admin)->postJson('/api/users', [
            'name' => 'Alice Auditor',
            'email' => 'alice@auditor.com',
            'password' => 'SecretPass123!',
            'role' => 'manager',
            'department' => 'Internal Audit',
        ]);

        $res->assertStatus(201);
        $createdId = $res->json('id');

        $this->assertDatabaseHas('audit_logs', [
            'category' => 'security',
            'action' => 'USER_CREATE',
            'user_id' => $admin->id,
        ]);

        // Toggle deactivate user
        $toggleRes = $this->actingAs($admin)->putJson("/api/users/{$createdId}/toggle-active", [
            'is_active' => false,
        ]);

        $toggleRes->assertStatus(200);

        $this->assertDatabaseHas('audit_logs', [
            'category' => 'security',
            'action' => 'STATUS_CHANGE',
            'user_id' => $admin->id,
        ]);
    }

    public function test_ticket_creation_records_audit_log(): void
    {
        $user = User::factory()->create(['role' => 'user', 'is_active' => true]);

        $response = $this->actingAs($user)->postJson('/api/tickets', [
            'title' => 'Audit Test Incident: VPN Disconnected',
            'description' => 'Cannot connect to production database cluster.',
            'priority' => 'high',
            'category' => 'incident',
        ]);

        $response->assertStatus(201);

        $this->assertDatabaseHas('audit_logs', [
            'category' => 'ticket',
            'action' => 'CREATE',
            'user_id' => $user->id,
        ]);
    }

    public function test_admin_can_retrieve_paginated_audit_logs_and_stats(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'is_active' => true]);

        // Seed some sample audit logs
        AuditLog::create([
            'user_id' => $admin->id,
            'user_name' => $admin->name,
            'user_email' => $admin->email,
            'user_role' => 'admin',
            'event_type' => 'auth.login',
            'category' => 'auth',
            'action' => 'LOGIN',
            'status' => 'success',
            'description' => 'User logged in',
            'ip_address' => '127.0.0.1',
        ]);

        AuditLog::create([
            'user_id' => $admin->id,
            'user_name' => $admin->name,
            'user_email' => $admin->email,
            'user_role' => 'admin',
            'event_type' => 'system.config_change',
            'category' => 'system',
            'action' => 'CONFIG_CHANGE',
            'status' => 'success',
            'description' => 'Brand color updated',
            'ip_address' => '127.0.0.1',
        ]);

        // Test List
        $listRes = $this->actingAs($admin)->getJson('/api/audit-logs?category=auth');
        $listRes->assertStatus(200)
            ->assertJsonStructure(['data', 'total', 'current_page']);
        $this->assertEquals(1, count($listRes->json('data')));

        // Test Stats
        $statsRes = $this->actingAs($admin)->getJson('/api/audit-logs/stats/summary');
        $statsRes->assertStatus(200)
            ->assertJsonStructure(['total_events', 'logins_today', 'failed_logins_24h', 'config_changes']);
        $this->assertGreaterThanOrEqual(2, $statsRes->json('total_events'));
    }

    public function test_regular_user_is_forbidden_from_viewing_audit_logs(): void
    {
        $user = User::factory()->create(['role' => 'user', 'is_active' => true]);

        $res = $this->actingAs($user)->getJson('/api/audit-logs');
        $res->assertStatus(403);
    }

    public function test_audit_logs_can_be_exported_to_csv(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'is_active' => true]);

        AuditLog::create([
            'user_id' => $admin->id,
            'user_name' => $admin->name,
            'user_email' => $admin->email,
            'user_role' => 'admin',
            'event_type' => 'auth.login',
            'category' => 'auth',
            'action' => 'LOGIN',
            'status' => 'success',
            'description' => 'Export test log entry',
            'ip_address' => '192.168.1.100',
        ]);

        $response = $this->actingAs($admin)->get('/api/audit-logs/export/csv');
        $response->assertStatus(200);
        $response->assertHeader('content-type', 'text/csv; charset=UTF-8');
    }
}
