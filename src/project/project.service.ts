import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './project.entity';
import { Page } from './page.entity';
import {
  CreatePageDto,
  CreateProjectDto,
  ProjectDto,
  ProjectSummaryDto,
  SavePageDto,
  UpdateProjectDto,
} from './dto/project';

@Injectable()
export class ProjectService {
  constructor(
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(Page)
    private pageRepository: Repository<Page>,
  ) {}

  async create(ownerId: string, dto: CreateProjectDto): Promise<ProjectDto> {
    const project = this.projectRepository.create({
      name: dto.name,
      industry: dto.industry,
      ownerId,
      pages: [{ pageName: 'Home Page', layers: [] }],
    });

    const saved = await this.projectRepository.save(project);
    return this.toProjectDto(saved);
  }

  async findAllForUser(ownerId: string): Promise<ProjectSummaryDto[]> {
    const projects = await this.projectRepository.find({
      where: { ownerId },
      order: { updatedAt: 'DESC' },
    });

    return projects.map((project) => this.toProjectSummaryDto(project));
  }

  async findOne(id: string, ownerId: string): Promise<ProjectDto> {
    const project = await this.projectRepository.findOne({
      where: { id },
      relations: ['pages'],
    });

    this.assertOwnership(project, ownerId);

    return this.toProjectDto(project!);
  }

  async update(
    id: string,
    ownerId: string,
    dto: UpdateProjectDto,
  ): Promise<ProjectDto> {
    const project = await this.projectRepository.findOne({
      where: { id },
      relations: ['pages'],
    });

    this.assertOwnership(project, ownerId);

    Object.assign(project!, dto);
    const saved = await this.projectRepository.save(project!);

    return this.toProjectDto(saved);
  }

  async findPage(projectId: string, pageId: string, ownerId: string): Promise<Page> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });

    this.assertOwnership(project, ownerId);

    const page = await this.pageRepository.findOne({
      where: { id: pageId, projectId },
    });

    if (!page) {
      throw new NotFoundException('Page not found');
    }

    return page;
  }

  async savePage(
    projectId: string,
    pageId: string,
    ownerId: string,
    dto: SavePageDto,
  ): Promise<void> {
    const page = await this.findPage(projectId, pageId, ownerId);

    page.layers = dto.layers;
    await this.pageRepository.save(page);
  }

  async createPage(
    projectId: string,
    ownerId: string,
    dto: CreatePageDto,
  ): Promise<Page> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });

    this.assertOwnership(project, ownerId);

    const page = this.pageRepository.create({
      projectId,
      pageName: dto.pageName,
      layers: [],
    });

    return this.pageRepository.save(page);
  }

  private assertOwnership(
    project: Project | null,
    ownerId: string,
  ): asserts project is Project {
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.ownerId !== ownerId) {
      throw new ForbiddenException('You do not have access to this project');
    }
  }

  private toProjectSummaryDto(project: Project): ProjectSummaryDto {
    return {
      id: project.id,
      name: project.name,
      industry: project.industry,
      status: project.status,
      updatedAt: project.updatedAt,
    };
  }

  private toProjectDto(project: Project): ProjectDto {
    return {
      ...this.toProjectSummaryDto(project),
      theme: project.theme,
      pages: (project.pages || []).map((page) => ({
        id: page.id,
        pageName: page.pageName,
      })),
    };
  }
}
