<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserSessionAndEmailValidationTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $regularUser;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create([
            'name' => 'Admin Testing',
            'email' => 'admin.sec@enterprise.co.id',
            'role' => 'admin',
            'is_active' => true,
        ]);

        $this->regularUser = User::factory()->create([
            'name' => 'Budi Santoso',
            'email' => 'budi.santoso@enterprise.co.id',
            'role' => 'user',
            'is_active' => true,
        ]);
    }

    public function test_creating_user_with_dummy_email_is_rejected(): void
    {
        $dummyEmails = [
            'test@test.com',
            'user@example.com',
            'dummy@dummy.com',
            'fake@fake.com',
            'asdf@asdf.com',
            'temp@mailinator.com',
            'budi@localhost',
            'test@sample.com',
        ];

        foreach ($dummyEmails as $dummyEmail) {
            $response = $this->actingAs($this->admin)->postJson('/api/users', [
                'name' => 'Dummy Account',
                'email' => $dummyEmail,
                'password' => 'SecurePass123!',
                'role' => 'user',
            ]);

            $response->assertStatus(422);
            $response->assertJsonStructure(['error']);
        }
    }

    public function test_creating_user_with_legitimate_email_succeeds(): void
    {
        $response = $this->actingAs($this->admin)->postJson('/api/users', [
            'name' => 'Deni Ramadhan',
            'email' => 'deni.ramadhan@perusahaan.co.id',
            'password' => 'SecurePass123!',
            'role' => 'agent',
            'is_it_support' => true,
            'department' => 'IT Infrastructure',
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('users', [
            'email' => 'deni.ramadhan@perusahaan.co.id',
            'is_it_support' => true,
        ]);
    }

    public function test_admin_can_view_and_clear_user_sessions(): void
    {
        // Generate active Sanctum tokens for the regular user
        $this->regularUser->createToken('MacBook Pro Chrome Session');
        $this->regularUser->createToken('iPhone Mobile Safari');

        $this->assertEquals(2, $this->regularUser->tokens()->count());

        // 1. Admin checks sessions
        $getResponse = $this->actingAs($this->admin)->getJson("/api/users/{$this->regularUser->id}/sessions");
        $getResponse->assertOk();
        $getResponse->assertJsonFragment(['total_active_sessions' => 2]);

        // 2. Admin clears sessions
        $clearResponse = $this->actingAs($this->admin)->postJson("/api/users/{$this->regularUser->id}/clear-sessions");
        $clearResponse->assertOk();
        $clearResponse->assertJsonFragment(['cleared_count' => 2]);

        // Verify tokens are deleted
        $this->assertEquals(0, $this->regularUser->fresh()->tokens()->count());

        // Verify audit log recorded
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'SESSION_REVOKE',
            'user_id' => $this->admin->id,
        ]);
    }

    public function test_realtime_check_email_endpoint(): void
    {
        // 1. Dummy email check
        $res1 = $this->actingAs($this->admin)->getJson('/api/users/check-email?email=test@test.com');
        $res1->assertOk();
        $res1->assertJsonFragment(['valid' => false, 'available' => false]);

        // 2. Existing email check
        $res2 = $this->actingAs($this->admin)->getJson("/api/users/check-email?email={$this->regularUser->email}");
        $res2->assertOk();
        $res2->assertJsonFragment(['valid' => true, 'available' => false]);

        // 3. Valid and new email check
        $res3 = $this->actingAs($this->admin)->getJson('/api/users/check-email?email=ahmad.fauzi@perusahaan.co.id');
        $res3->assertOk();
        $res3->assertJsonFragment(['valid' => true, 'available' => true, 'domain' => 'perusahaan.co.id']);
    }

    public function test_admin_can_resend_welcome_verification_email(): void
    {
        $response = $this->actingAs($this->admin)->postJson("/api/users/{$this->regularUser->id}/resend-verification");
        $response->assertOk();
        $response->assertJsonStructure(['success', 'message']);

        // Verify audit log recorded
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'VERIFICATION_EMAIL_SENT',
            'user_id' => $this->admin->id,
        ]);
    }

    public function test_regular_user_cannot_manage_other_user_sessions(): void
    {
        $response = $this->actingAs($this->regularUser)->getJson("/api/users/{$this->admin->id}/sessions");
        $response->assertForbidden();

        $clearResponse = $this->actingAs($this->regularUser)->postJson("/api/users/{$this->admin->id}/clear-sessions");
        $clearResponse->assertForbidden();
    }
}
