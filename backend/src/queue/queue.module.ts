import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
    imports: [
        BullModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                redis: {
                    host: configService.get('REDIS_HOST') || 'localhost',
                    port: configService.get('REDIS_PORT') || 6379,
                    password: configService.get('REDIS_PASSWORD'),
                    maxRetriesPerRequest: 3,
                    enableReadyCheck: false,
                    retryStrategy: (times) => {
                        if (times > 3) {
                            return null; // Stop retrying
                        }
                        return Math.min(times * 100, 3000);
                    },
                },
            }),
            inject: [ConfigService],
        }),
        BullModule.registerQueue(
            {
                name: 'ocr-processing',
            },
            {
                name: 'ai-evaluation',
            },
        ),
    ],
    exports: [BullModule],
})
export class QueueModule { }
