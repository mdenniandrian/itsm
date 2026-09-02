<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('device_agents', function (Blueprint $table) {
            $table->string('last_screenshot_path')->nullable()->after('current_window_title');
            $table->timestamp('last_screenshot_at')->nullable()->after('last_screenshot_path');
        });
    }

    public function down(): void
    {
        Schema::table('device_agents', function (Blueprint $table) {
            $table->dropColumn(['last_screenshot_path', 'last_screenshot_at']);
        });
    }
};
