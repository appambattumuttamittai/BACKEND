"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProductSchema = void 0;
const zod_1 = require("zod");
exports.updateProductSchema = zod_1.z.object({
    price: zod_1.z.number().positive('Price must be positive').optional(),
    inStock: zod_1.z.boolean().optional(),
});
//# sourceMappingURL=products.schema.js.map