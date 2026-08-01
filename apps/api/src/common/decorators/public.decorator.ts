import "reflect-metadata";

// Simple marker for public routes (used by documentation generators)
export function Public() {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    Reflect.defineMetadata("isPublic", true, target, propertyKey);
  };
}
