export const uploadConfig = {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: [
        'application/pdf',
        'image/jpeg',
        'image/jpg',
        'image/png',
    ],
    destination: './uploads/answer-sheets',
};

export const ocrConfig = {
    confidenceThreshold: 0.85,
    trustworthyThreshold: 0.9,
    maxRetries: 3,
};
