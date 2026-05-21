import { index, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

import { vendors } from './vendors';
import { controls } from './controls';

export const vendorControls = pgTable(
  'vendor_controls',
  {
    vendorId: text('vendor_id')
      .notNull()
      .references(() => vendors.id, { onDelete: 'cascade' }),
    controlId: text('control_id')
      .notNull()
      .references(() => controls.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    vendorIdIdx: index('vendor_controls_vendor_id_idx').on(t.vendorId),
    controlIdIdx: index('vendor_controls_control_id_idx').on(t.controlId),
  }),
);

export type VendorControl = typeof vendorControls.$inferSelect;
