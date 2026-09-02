<?php

namespace Tests\Feature;

use App\Models\AddonConfig;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LdapAuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_local_admin_can_still_login_when_ldap_enabled()
    {
        $admin = User::create([
            'name' => 'Super Administrator',
            'email' => 'admin@itsm.com',
            'password' => bcrypt('admin123'),
            'role' => 'admin',
            'is_active' => true,
        ]);

        AddonConfig::create([
            'addon_key' => 'ldap',
            'name' => 'LDAP',
            'is_enabled' => true,
            'config' => [
                'host' => '127.0.0.1',
                'port' => 389,
                'base_dn' => 'dc=bangden,dc=my,dc=id',
                'bind_dn' => 'uid=zimbra,cn=admins,cn=zimbra',
                'bind_password' => 'secret',
                'user_filter' => '(&(objectClass=zimbraAccount)(|(uid={username})(mail={username})))',
            ],
        ]);

        $res = $this->postJson('/api/auth/login', [
            'email' => 'admin@itsm.com',
            'password' => 'admin123',
        ]);

        $res->assertStatus(200)
            ->assertJsonStructure([
                'token',
                'user' => ['id', 'name', 'email', 'role'],
            ]);
    }

    public function test_invalid_credentials_returns_401()
    {
        $res = $this->postJson('/api/auth/login', [
            'email' => 'nonexistent@bangden.my.id',
            'password' => 'wrongpass',
        ]);

        $res->assertStatus(401);
    }
}
