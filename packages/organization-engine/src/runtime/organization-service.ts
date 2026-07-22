import { randomUUID } from 'node:crypto';
import type {
  Member,
  OrgProject,
  Organization,
  OrganizationPermission,
  OrganizationRole,
  Team,
} from '@mycli/enterprise-core';
import { slugify } from '../config.js';

const ROLE_PERMISSIONS: Record<OrganizationRole, OrganizationPermission[]> = {
  owner: [
    'org:read',
    'org:write',
    'org:delete',
    'team:read',
    'team:write',
    'member:read',
    'member:write',
    'project:read',
    'project:write',
    'project:delete',
    'role:assign',
  ],
  admin: [
    'org:read',
    'org:write',
    'team:read',
    'team:write',
    'member:read',
    'member:write',
    'project:read',
    'project:write',
    'project:delete',
    'role:assign',
  ],
  member: ['org:read', 'team:read', 'member:read', 'project:read', 'project:write'],
  viewer: ['org:read', 'team:read', 'member:read', 'project:read'],
};

export class OrganizationStore {
  readonly organizations = new Map<string, Organization>();
  readonly teams = new Map<string, Team>();
  readonly members = new Map<string, Member>();
  readonly projects = new Map<string, OrgProject>();
}

export class OrganizationService {
  constructor(private readonly store: OrganizationStore = new OrganizationStore()) {}

  getStore(): OrganizationStore {
    return this.store;
  }

  create(name: string, metadata?: Record<string, unknown>): Organization {
    const org: Organization = {
      id: randomUUID(),
      name,
      slug: slugify(name),
      createdAt: new Date(),
      metadata,
    };
    this.store.organizations.set(org.id, org);
    return org;
  }

  get(id: string): Organization | undefined {
    return this.store.organizations.get(id);
  }

  list(): Organization[] {
    return [...this.store.organizations.values()];
  }

  rename(id: string, name: string): Organization {
    const org = this.requireOrg(id);
    org.name = name;
    org.slug = slugify(name);
    return org;
  }

  delete(id: string): boolean {
    for (const team of this.store.teams.values()) {
      if (team.organizationId === id) this.store.teams.delete(team.id);
    }
    for (const member of this.store.members.values()) {
      if (member.organizationId === id) this.store.members.delete(member.id);
    }
    for (const project of this.store.projects.values()) {
      if (project.organizationId === id) this.store.projects.delete(project.id);
    }
    return this.store.organizations.delete(id);
  }

  private requireOrg(id: string): Organization {
    const org = this.store.organizations.get(id);
    if (!org) throw new Error(`Organization not found: ${id}`);
    return org;
  }
}

export class TeamService {
  constructor(private readonly store: OrganizationStore) {}

  create(organizationId: string, name: string): Team {
    if (!this.store.organizations.has(organizationId)) {
      throw new Error(`Organization not found: ${organizationId}`);
    }
    const team: Team = {
      id: randomUUID(),
      organizationId,
      name,
      slug: slugify(name),
      createdAt: new Date(),
    };
    this.store.teams.set(team.id, team);
    return team;
  }

  listByOrganization(organizationId: string): Team[] {
    return [...this.store.teams.values()].filter((team) => team.organizationId === organizationId);
  }

  get(id: string): Team | undefined {
    return this.store.teams.get(id);
  }

  delete(id: string): boolean {
    for (const member of this.store.members.values()) {
      member.teamIds = member.teamIds.filter((teamId) => teamId !== id);
    }
    return this.store.teams.delete(id);
  }
}

export class MemberService {
  constructor(private readonly store: OrganizationStore) {}

  add(
    organizationId: string,
    input: { userId: string; email: string; role?: OrganizationRole; teamIds?: string[] },
  ): Member {
    if (!this.store.organizations.has(organizationId)) {
      throw new Error(`Organization not found: ${organizationId}`);
    }
    const member: Member = {
      id: randomUUID(),
      organizationId,
      userId: input.userId,
      email: input.email,
      role: input.role ?? 'member',
      teamIds: input.teamIds ?? [],
      joinedAt: new Date(),
    };
    this.store.members.set(member.id, member);
    return member;
  }

  listByOrganization(organizationId: string): Member[] {
    return [...this.store.members.values()].filter(
      (member) => member.organizationId === organizationId,
    );
  }

  assignTeam(memberId: string, teamId: string): Member {
    const member = this.requireMember(memberId);
    const team = this.store.teams.get(teamId);
    if (!team || team.organizationId !== member.organizationId) {
      throw new Error(`Team not found in organization: ${teamId}`);
    }
    if (!member.teamIds.includes(teamId)) member.teamIds.push(teamId);
    return member;
  }

  setRole(memberId: string, role: OrganizationRole): Member {
    const member = this.requireMember(memberId);
    member.role = role;
    return member;
  }

  remove(memberId: string): boolean {
    return this.store.members.delete(memberId);
  }

  private requireMember(id: string): Member {
    const member = this.store.members.get(id);
    if (!member) throw new Error(`Member not found: ${id}`);
    return member;
  }
}

export class ProjectService {
  constructor(private readonly store: OrganizationStore) {}

  create(
    organizationId: string,
    name: string,
    options: { teamId?: string; metadata?: Record<string, unknown> } = {},
  ): OrgProject {
    if (!this.store.organizations.has(organizationId)) {
      throw new Error(`Organization not found: ${organizationId}`);
    }
    if (options.teamId) {
      const team = this.store.teams.get(options.teamId);
      if (!team || team.organizationId !== organizationId) {
        throw new Error(`Team not found in organization: ${options.teamId}`);
      }
    }
    const project: OrgProject = {
      id: randomUUID(),
      organizationId,
      name,
      slug: slugify(name),
      teamId: options.teamId,
      createdAt: new Date(),
      metadata: options.metadata,
    };
    this.store.projects.set(project.id, project);
    return project;
  }

  listByOrganization(organizationId: string): OrgProject[] {
    return [...this.store.projects.values()].filter(
      (project) => project.organizationId === organizationId,
    );
  }

  delete(id: string): boolean {
    return this.store.projects.delete(id);
  }
}

export class PermissionService {
  constructor(private readonly store: OrganizationStore) {}

  permissionsForRole(role: OrganizationRole): OrganizationPermission[] {
    return [...ROLE_PERMISSIONS[role]];
  }

  can(memberId: string, permission: OrganizationPermission): boolean {
    const member = this.store.members.get(memberId);
    if (!member) return false;
    return ROLE_PERMISSIONS[member.role].includes(permission);
  }

  assert(memberId: string, permission: OrganizationPermission): void {
    if (!this.can(memberId, permission)) {
      throw new Error(`Permission denied: ${permission}`);
    }
  }
}

export class OrganizationPlatform {
  readonly organizations: OrganizationService;
  readonly teams: TeamService;
  readonly members: MemberService;
  readonly projects: ProjectService;
  readonly permissions: PermissionService;

  constructor(store: OrganizationStore = new OrganizationStore()) {
    this.organizations = new OrganizationService(store);
    this.teams = new TeamService(store);
    this.members = new MemberService(store);
    this.projects = new ProjectService(store);
    this.permissions = new PermissionService(store);
  }
}

export function createOrganizationPlatform(): OrganizationPlatform {
  return new OrganizationPlatform();
}
