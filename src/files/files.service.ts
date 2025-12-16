import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FileType } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class FilesService {
  private readonly uploadDir = path.join(process.cwd(), 'uploads');

  constructor(private prisma: PrismaService) {
    // Ensure upload directory exists
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  private getFileType(mimeType: string): FileType {
    if (mimeType.startsWith('image/')) {
      return FileType.IMAGE;
    }
    if (
      mimeType.includes('pdf') ||
      mimeType.includes('document') ||
      mimeType.includes('text') ||
      mimeType.includes('spreadsheet')
    ) {
      return FileType.DOCUMENT;
    }
    return FileType.OTHER;
  }

  async saveFile(
    file: Express.Multer.File,
    taskId: string,
  ): Promise<{ id: string; url: string }> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    const ext = path.extname(file.originalname);
    const filename = `${timestamp}-${randomStr}${ext}`;
    const filePath = path.join(this.uploadDir, filename);

    // Save file to disk
    fs.writeFileSync(filePath, file.buffer);

    // Determine file type
    const fileType = this.getFileType(file.mimetype);

    // Save file metadata to database
    const taskFile = await this.prisma.taskFile.create({
      data: {
        taskId,
        filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        fileType,
        url: `/uploads/${filename}`,
      },
    });

    return {
      id: taskFile.id,
      url: taskFile.url,
    };
  }

  async deleteFile(fileId: string): Promise<void> {
    const file = await this.prisma.taskFile.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      throw new BadRequestException('File not found');
    }

    // Delete file from disk
    const filePath = path.join(this.uploadDir, file.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete from database
    await this.prisma.taskFile.delete({
      where: { id: fileId },
    });
  }

  async getTaskFiles(taskId: string) {
    return this.prisma.taskFile.findMany({
      where: { taskId },
      orderBy: { createdAt: 'desc' },
    });
  }
}

