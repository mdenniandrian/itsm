<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('addon_configs', function (Blueprint $table) {
            $table->id();
            $table->string('addon_key')->unique();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('icon')->default('🧩');
            $table->string('category')->default('integration'); // notification, authentication, integration
            $table->boolean('is_enabled')->default(false);
            $table->json('config')->nullable();
            $table->timestamp('last_tested_at')->nullable();
            $table->string('last_test_status')->nullable()->default('untested'); // success, failed, untested
            $table->text('last_test_message')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('addon_configs');
    }
};
