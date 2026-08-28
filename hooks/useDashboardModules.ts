const modules: Array<{
    moduleId: string;
    moduleSlug: string;
    displayName: string;
    iconPath: string;
    requiredPermissions: string[];
    children: unknown[];
  }> = [];

const demoModule = {
    moduleId: "tech-team-dashboard",
    moduleSlug: "/tech-team-dashboard",
    displayName: "Tech Team Dashboard",
    iconPath: "PeopleTeam20Regular",
    requiredPermissions: [],
    children: []
  };
  
  modules.push(demoModule);

export default modules;