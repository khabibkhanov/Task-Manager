import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { GroupsModule } from './groups/groups.module';
import { TasksModule } from './tasks/tasks.module';
import { CompaniesModule } from './companies/companies.module';
import { CommentsModule } from './comments/comments.module';
import { ActivitiesModule } from './activities/activities.module';
import { NotificationsModule } from './notifications/notifications.module';
import { WebSocketModule } from './websocket/websocket.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { ConfigModule } from './config/config.module';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    RedisModule,
    UsersModule,
    AuthModule,
    CompaniesModule,
    GroupsModule,
    TasksModule,
    CommentsModule,
    ActivitiesModule,
    NotificationsModule,
    WebSocketModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
