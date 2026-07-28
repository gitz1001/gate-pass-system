<?php
// ════════════════════════════════════════════════════════════════
// Photo Upload API — Saves student photos as WebP files locally
// ════════════════════════════════════════════════════════════════
// 
// Receives a Base64-encoded image via POST, converts it to WebP,
// and saves it to the ../photos/ directory with the student's PassID.
// Returns the relative path (e.g., "photos/PGP-001.webp").
//
// This endpoint is used by the e-Gatepass system to store photos
// locally instead of embedding massive Base64 strings in Google Sheets.
// ════════════════════════════════════════════════════════════════

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'error' => 'POST method required']);
    exit;
}

// Read JSON body
$input = json_decode(file_get_contents('php://input'), true);

if (!$input || empty($input['studentId']) || empty($input['imageData'])) {
    echo json_encode(['success' => false, 'error' => 'Missing studentId or imageData']);
    exit;
}

$studentId = preg_replace('/[^a-zA-Z0-9\-_]/', '', $input['studentId']); // Sanitize filename
$imageData = $input['imageData'];

// Create photos directory if it doesn't exist
$photosDir = __DIR__ . '/../photos';
if (!is_dir($photosDir)) {
    mkdir($photosDir, 0755, true);
}

// Extract the Base64 data (strip the data:image/xxx;base64, prefix)
$base64Data = $imageData;
if (strpos($imageData, ',') !== false) {
    $base64Data = explode(',', $imageData)[1];
}

$decoded = base64_decode($base64Data);
if ($decoded === false) {
    echo json_encode(['success' => false, 'error' => 'Invalid Base64 data']);
    exit;
}

// Try to convert to WebP for maximum compression
$filename = $studentId . '.webp';
$filepath = $photosDir . '/' . $filename;

$image = @imagecreatefromstring($decoded);
if ($image) {
    // Successfully loaded — save as WebP (quality 80 = good balance)
    imagewebp($image, $filepath, 80);
    imagedestroy($image);
} else {
    // Fallback: save as-is (probably already WebP or JPEG)
    // Detect format from original data URI
    if (strpos($imageData, 'image/jpeg') !== false || strpos($imageData, 'image/jpg') !== false) {
        $filename = $studentId . '.jpg';
    } elseif (strpos($imageData, 'image/png') !== false) {
        $filename = $studentId . '.png';
    }
    $filepath = $photosDir . '/' . $filename;
    file_put_contents($filepath, $decoded);
}

// Return the relative path (from the web root of the gate-pass-system)
$relativePath = 'photos/' . $filename;

echo json_encode([
    'success' => true,
    'path' => $relativePath,
    'size' => filesize($filepath)
]);
