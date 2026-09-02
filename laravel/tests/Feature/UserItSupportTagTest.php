<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserItSupportTagTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $regularUser;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create([
            'email' => 'admin@bangden.my.id',
            'role' => 'admin',
            'is_it_support' => true,
        ]);

        $this->regularUser = User::factory()->create([
            'name' => 'Budi LDAP',
            'email' => 'budi@bangden.my.id',
            'role' => 'user',
            'auth_source' => 'ldap',
            'is_it_support' => false,
        ]);
    }

    public function test_admin_can_toggle_it_support_tag_on_and_off(): void
    {
        // 1. Toggle ON
        $responseOn = $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/users/{$this->regularUser->id}/toggle-it-support", [
                'is_it_support' => true,
                'it_specialty' => 'SysAdmin Zimbra & Linux Server',
            ]);

        $responseOn->assertStatus(200);
        $fresh = $this->regularUser->fresh();
        $this->assertTrue($fresh->is_it_support);
        $this->assertEquals('agent', $fresh->role);

        // 2. Toggle OFF (Click again)
        $responseOff = $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/users/{$this->regularUser->id}/toggle-it-support", [
                'is_it_support' => false,
            ]);

        $responseOff->assertStatus(200);
        $freshOff = $this->regularUser->fresh();
        $this->assertFalse($freshOff->is_it_support);
        $this->assertEquals('user', $freshOff->role);
        $this->assertNull($freshOff->it_specialty);
    }

    public function test_users_list_filters_by_it_support(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/users?is_it_support=true');

        $response->assertStatus(200);
        $users = $response->json();
        $this->assertNotEmpty($users);
        $this->assertEquals('admin@bangden.my.id', $users[0]['email']);
    }

    public function test_admin_can_toggle_user_active_and_nonaktif(): void
    {
        // 1. Deactivate
        $resDeactivate = $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/users/{$this->regularUser->id}/toggle-active", [
                'is_active' => false,
            ]);

        $resDeactivate->assertStatus(200);
        $this->assertFalse($this->regularUser->fresh()->is_active);

        // 2. Activate again
        $resActivate = $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/users/{$this->regularUser->id}/toggle-active", [
                'is_active' => true,
            ]);

        $resActivate->assertStatus(200);
        $this->assertTrue($this->regularUser->fresh()->is_active);
    }

    public function test_admin_cannot_deactivate_or_delete_self(): void
    {
        $resDeactivateSelf = $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/users/{$this->admin->id}/toggle-active", [
                'is_active' => false,
            ]);

        $resDeactivateSelf->assertStatus(400);

        $resDeleteSelf = $this->actingAs($this->admin, 'sanctum')
            ->deleteJson("/api/users/{$this->admin->id}");

        $resDeleteSelf->assertStatus(400);
    }

    public function test_admin_can_delete_regular_user_permanently(): void
    {
        $userToDelete = User::factory()->create([
            'name' => 'User To Delete',
            'email' => 'delete_me@itsm.com',
            'role' => 'user',
        ]);

        $res = $this->actingAs($this->admin, 'sanctum')
            ->deleteJson("/api/users/{$userToDelete->id}");

        $res->assertStatus(200);
        $this->assertNull(User::find($userToDelete->id));
    }

    public function test_regular_user_cannot_delete_or_toggle_users(): void
    {
        $res = $this->actingAs($this->regularUser, 'sanctum')
            ->deleteJson("/api/users/{$this->admin->id}");

        $res->assertStatus(403);
    }
}
