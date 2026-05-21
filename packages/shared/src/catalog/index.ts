export * from './soc2-security';
export * from './iso27001';

// Combined catalog for lookup by ID across all frameworks
export { CATALOG_BY_ID as SOC2_CATALOG_BY_ID } from './soc2-security';
import { CATALOG_BY_ID as SOC2_BY_ID } from './soc2-security';
import { ISO27001_CATALOG_BY_ID } from './iso27001';
import { SOC2_SECURITY_CONTROLS } from './soc2-security';
import { ISO27001_CONTROLS } from './iso27001';

export const ALL_CONTROLS_CATALOG = [...SOC2_SECURITY_CONTROLS, ...ISO27001_CONTROLS];
export const ALL_CATALOG_BY_ID = { ...SOC2_BY_ID, ...ISO27001_CATALOG_BY_ID };
