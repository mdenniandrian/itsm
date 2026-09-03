<?php

use Illuminate\Support\Facades\Route;

// Public Login Portal
Route::get('/', function () {
    return file_get_contents(public_path('index.html'));
});

Route::get('/login', function () {
    return file_get_contents(public_path('index.html'));
});

// Clean SPA Application Routes (e.g. /home, /dashboard, /tickets, /assets, /changes, /kpi, etc.)
Route::get('/{any}', function () {
    return file_get_contents(public_path('app.html'));
})->where('any', '^(?!api|storage|css|js|images|uploads|favicon\.ico|robots\.txt).*$');
