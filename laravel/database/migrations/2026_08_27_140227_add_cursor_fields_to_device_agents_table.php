<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('device_agents', function (Blueprint $table) {
            $table->decimal('cursor_x_pct', 6, 2)->nullable()->default(50.0)->after('last_screenshot_at');
            $table->decimal('cursor_y_pct', 6, 2)->nullable()->default(50.0)->after('cursor_x_pct');
            $table->integer('cursor_x')->nullable()->after('cursor_y_pct');
            $table->integer('cursor_y')->nullable()->after('cursor_x');
            $table->integer('screen_width')->nullable()->default(1920)->after('cursor_y');
            $table->integer('screen_height')->nullable()->default(1080)->after('screen_width');
            $table->boolean('is_streaming')->default(false)->after('screen_height');
        });
    }

    public function down(): void
    {
        Schema::table('device_agents', function (Blueprint $table) {
            $table->dropColumn([
                'cursor_x_pct',
                'cursor_y_pct',
                'cursor_x',
                'cursor_y',
                'screen_width',
                'screen_height',
                'is_streaming',
            ]);
        });
    }
};
