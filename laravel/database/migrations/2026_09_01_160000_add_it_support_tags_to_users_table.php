<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('is_it_support')->default(false)->after('role')->index();
            $table->string('it_specialty')->nullable()->after('is_it_support'); // e.g. "Helpdesk Tier 1", "Network & Infra", "SysAdmin"
            $table->json('it_tags')->nullable()->after('it_specialty'); // e.g. ["IT Support", "Hardware", "Zimbra"]
            $table->string('auth_source')->default('local')->after('is_active'); // 'local', 'ldap'
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['is_it_support', 'it_specialty', 'it_tags', 'auth_source']);
        });
    }
};
