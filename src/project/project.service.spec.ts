import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ObjectLiteral, Repository } from 'typeorm';
import { ProjectService } from './project.service';
import { Project } from './project.entity';
import { Page } from './page.entity';

type MockRepository<T extends ObjectLiteral = any> = Partial<
  Record<keyof Repository<T>, jest.Mock>
>;

const createMockRepository = <T extends ObjectLiteral = any>(): MockRepository<T> => ({
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  delete: jest.fn(),
});

describe('ProjectService', () => {
  let service: ProjectService;
  let projectRepository: MockRepository<Project>;
  let pageRepository: MockRepository<Page>;

  const ownerId = 'owner-1';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectService,
        { provide: getRepositoryToken(Project), useValue: createMockRepository<Project>() },
        { provide: getRepositoryToken(Page), useValue: createMockRepository<Page>() },
      ],
    }).compile();

    service = module.get<ProjectService>(ProjectService);
    projectRepository = module.get(getRepositoryToken(Project));
    pageRepository = module.get(getRepositoryToken(Page));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('creates a project with a default Home Page and returns it as a ProjectDto', async () => {
      const created = {
        id: 'p1',
        name: 'My Site',
        ownerId,
        status: 'draft',
        pages: [],
      } as unknown as Project;
      projectRepository.create!.mockReturnValue(created);
      projectRepository.save!.mockResolvedValue({
        ...created,
        pages: [{ id: 'pg1', pageName: 'Home Page' }],
      });

      const result = await service.create(ownerId, { name: 'My Site' });

      expect(projectRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'My Site',
          ownerId,
          pages: [{ pageName: 'Home Page', layers: [] }],
        }),
      );
      expect(result).toEqual(
        expect.objectContaining({
          id: 'p1',
          name: 'My Site',
          pages: [{ id: 'pg1', pageName: 'Home Page' }],
        }),
      );
    });
  });

  describe('findAllForUser', () => {
    it('queries projects scoped to the owner, newest first', async () => {
      projectRepository.find!.mockResolvedValue([
        { id: 'p1', name: 'A', ownerId, status: 'draft' },
      ]);

      const result = await service.findAllForUser(ownerId);

      expect(projectRepository.find).toHaveBeenCalledWith({
        where: { ownerId },
        order: { updatedAt: 'DESC' },
      });
      expect(result).toEqual([
        expect.objectContaining({ id: 'p1', name: 'A', status: 'draft' }),
      ]);
    });
  });

  describe('findOne', () => {
    it('returns the project when the caller owns it', async () => {
      projectRepository.findOne!.mockResolvedValue({
        id: 'p1',
        ownerId,
        name: 'A',
        status: 'draft',
        pages: [],
      });

      const result = await service.findOne('p1', ownerId);

      expect(result).toEqual(expect.objectContaining({ id: 'p1', name: 'A' }));
    });

    it('throws NotFoundException when the project does not exist', async () => {
      projectRepository.findOne!.mockResolvedValue(null);

      await expect(service.findOne('missing', ownerId)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when the caller is not the owner', async () => {
      projectRepository.findOne!.mockResolvedValue({
        id: 'p1',
        ownerId: 'someone-else',
        pages: [],
      });

      await expect(service.findOne('p1', ownerId)).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('update', () => {
    it('merges the update dto into the owned project and saves it', async () => {
      const existing = { id: 'p1', ownerId, name: 'Old', status: 'draft', pages: [] };
      projectRepository.findOne!.mockResolvedValue(existing);
      projectRepository.save!.mockImplementation(async (p) => p);

      const result = await service.update('p1', ownerId, { name: 'New' });

      expect(projectRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'New' }),
      );
      expect(result).toEqual(expect.objectContaining({ name: 'New' }));
    });
  });

  describe('findPage', () => {
    it('returns the page when the project is owned and the page exists', async () => {
      projectRepository.findOne!.mockResolvedValue({ id: 'p1', ownerId });
      pageRepository.findOne!.mockResolvedValue({ id: 'pg1', projectId: 'p1', layers: [] });

      const page = await service.findPage('p1', 'pg1', ownerId);

      expect(pageRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'pg1', projectId: 'p1' },
      });
      expect(page).toEqual(expect.objectContaining({ id: 'pg1' }));
    });

    it('throws NotFoundException when the page does not exist on that project', async () => {
      projectRepository.findOne!.mockResolvedValue({ id: 'p1', ownerId });
      pageRepository.findOne!.mockResolvedValue(null);

      await expect(service.findPage('p1', 'missing', ownerId)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when the project is not owned by the caller', async () => {
      projectRepository.findOne!.mockResolvedValue({ id: 'p1', ownerId: 'someone-else' });

      await expect(service.findPage('p1', 'pg1', ownerId)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });
  });

  describe('savePage', () => {
    it('overwrites the page layers and persists them', async () => {
      projectRepository.findOne!.mockResolvedValue({ id: 'p1', ownerId });
      const page = { id: 'pg1', projectId: 'p1', layers: [] };
      pageRepository.findOne!.mockResolvedValue(page);
      pageRepository.save!.mockResolvedValue(undefined);

      const newLayers = [{ id: 'l1' }] as any;
      await service.savePage('p1', 'pg1', ownerId, { layers: newLayers });

      expect(pageRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ layers: newLayers }),
      );
    });
  });

  describe('createPage', () => {
    it('creates a new empty page under the owned project', async () => {
      projectRepository.findOne!.mockResolvedValue({ id: 'p1', ownerId });
      pageRepository.create!.mockReturnValue({ projectId: 'p1', pageName: 'About', layers: [] });
      pageRepository.save!.mockResolvedValue({
        id: 'pg2',
        projectId: 'p1',
        pageName: 'About',
        layers: [],
      });

      const page = await service.createPage('p1', ownerId, { pageName: 'About' });

      expect(pageRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ projectId: 'p1', pageName: 'About', layers: [] }),
      );
      expect(page).toEqual(expect.objectContaining({ id: 'pg2', pageName: 'About' }));
    });
  });

  describe('deletePage', () => {
    it('deletes the page when the project has more than one', async () => {
      projectRepository.findOne!.mockResolvedValue({
        id: 'p1',
        ownerId,
        pages: [{ id: 'pg1' }, { id: 'pg2' }],
      });
      pageRepository.delete!.mockResolvedValue(undefined);

      await service.deletePage('p1', 'pg2', ownerId);

      expect(pageRepository.delete).toHaveBeenCalledWith({ id: 'pg2', projectId: 'p1' });
    });

    it('throws BadRequestException when it is the only page', async () => {
      projectRepository.findOne!.mockResolvedValue({
        id: 'p1',
        ownerId,
        pages: [{ id: 'pg1' }],
      });

      await expect(service.deletePage('p1', 'pg1', ownerId)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(pageRepository.delete).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the page does not belong to the project', async () => {
      projectRepository.findOne!.mockResolvedValue({
        id: 'p1',
        ownerId,
        pages: [{ id: 'pg1' }, { id: 'pg2' }],
      });

      await expect(service.deletePage('p1', 'missing', ownerId)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when the project is not owned by the caller', async () => {
      projectRepository.findOne!.mockResolvedValue({
        id: 'p1',
        ownerId: 'someone-else',
        pages: [{ id: 'pg1' }, { id: 'pg2' }],
      });

      await expect(service.deletePage('p1', 'pg1', ownerId)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });
  });
});
