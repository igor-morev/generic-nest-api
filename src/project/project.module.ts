import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectService } from './project.service';
import { ProjectController } from './project.controller';
import { SiteController } from './site.controller';
import { Project } from './project.entity';
import { Page } from './page.entity';
import { ExportModule } from 'src/export/export.module';

@Module({
  imports: [TypeOrmModule.forFeature([Project, Page]), ExportModule],
  providers: [ProjectService],
  controllers: [ProjectController, SiteController],
  exports: [ProjectService],
})
export class ProjectModule {}
