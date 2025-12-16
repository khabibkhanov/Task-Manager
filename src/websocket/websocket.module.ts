import { Module } from '@nestjs/common';
import { NotificationsGateway } from './websocket.gateway';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '../config/config.module';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: any) => {
        const jwtSecret = configService.get('JWT_SECRET') || 'your-secret-key';
        return {
          secret: jwtSecret,
          signOptions: { expiresIn: '7d' },
        };
      },
      inject: ['AppConfigService'],
    }),
    ConfigModule,
  ],
  providers: [NotificationsGateway],
  exports: [NotificationsGateway],
})
export class WebSocketModule {}

