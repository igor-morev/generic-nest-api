import { Test, TestingModule } from '@nestjs/testing';
import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';
import { JwtPayload } from 'src/auth/types/jwt';

describe('ProjectController', () => {
  let controller: ProjectController;
  let service: Partial<Record<keyof ProjectService, jest.Mock>>;

  const user: { user: JwtPayload } = { user: { sub: 'owner-1', username: 'igor' } };

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      findAllForUser: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      findPage: jest.fn(),
      savePage: jest.fn(),
      createPage: jest.fn(),
      deletePage: jest.fn(),
      publish: jest.fn(),
      unpublish: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectController],
      providers: [{ provide: ProjectService, useValue: service }],
    }).compile();

    controller = module.get<ProjectController>(ProjectController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create() delegates to ProjectService.create with the caller id', () => {
    controller.create(user, { name: 'Site' });
    expect(service.create).toHaveBeenCalledWith('owner-1', { name: 'Site' });
  });

  it('list() delegates to ProjectService.findAllForUser with the caller id', () => {
    controller.list(user);
    expect(service.findAllForUser).toHaveBeenCalledWith('owner-1');
  });

  it('getOne() delegates to ProjectService.findOne with project id + caller id', () => {
    controller.getOne(user, 'p1');
    expect(service.findOne).toHaveBeenCalledWith('p1', 'owner-1');
  });

  it('update() delegates to ProjectService.update with project id, caller id, and dto', () => {
    controller.update(user, 'p1', { name: 'New name' });
    expect(service.update).toHaveBeenCalledWith('p1', 'owner-1', { name: 'New name' });
  });

  it('getPage() delegates to ProjectService.findPage', () => {
    controller.getPage(user, 'p1', 'pg1');
    expect(service.findPage).toHaveBeenCalledWith('p1', 'pg1', 'owner-1');
  });

  it('getLayers() resolves the page via ProjectService.findPage and returns only its layers', async () => {
    service.findPage!.mockResolvedValue({ id: 'pg1', layers: [{ id: 'l1' }] });

    const layers = await controller.getLayers(user, 'p1', 'pg1');

    expect(service.findPage).toHaveBeenCalledWith('p1', 'pg1', 'owner-1');
    expect(layers).toEqual([{ id: 'l1' }]);
  });

  it('savePage() delegates to ProjectService.savePage with the layers payload', () => {
    const dto = { layers: [{ id: 'l1' }] } as any;
    controller.savePage(user, 'p1', 'pg1', dto);
    expect(service.savePage).toHaveBeenCalledWith('p1', 'pg1', 'owner-1', dto);
  });

  it('createPage() delegates to ProjectService.createPage', () => {
    controller.createPage(user, 'p1', { pageName: 'About' });
    expect(service.createPage).toHaveBeenCalledWith('p1', 'owner-1', { pageName: 'About' });
  });

  it('deletePage() delegates to ProjectService.deletePage', () => {
    controller.deletePage(user, 'p1', 'pg1');
    expect(service.deletePage).toHaveBeenCalledWith('p1', 'pg1', 'owner-1');
  });

  it('publish() delegates to ProjectService.publish with the caller id', () => {
    controller.publish(user, 'p1');
    expect(service.publish).toHaveBeenCalledWith('p1', 'owner-1');
  });

  it('unpublish() delegates to ProjectService.unpublish with the caller id', () => {
    controller.unpublish(user, 'p1');
    expect(service.unpublish).toHaveBeenCalledWith('p1', 'owner-1');
  });
});
