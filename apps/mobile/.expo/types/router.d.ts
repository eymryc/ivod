/* eslint-disable */
import * as Router from 'expo-router';

export * from 'expo-router';

declare module 'expo-router' {
  export namespace ExpoRouter {
    export interface __routes<T extends string = string> extends Record<string, unknown> {
      StaticRoutes: `/` | `/(tabs)` | `/(tabs)/` | `/(tabs)/catalogue` | `/(tabs)/downloads` | `/(tabs)/profil` | `/_sitemap` | `/auth/login` | `/catalogue` | `/downloads` | `/profil`;
      DynamicRoutes: `/watch/${Router.SingleRoutePart<T>}`;
      DynamicRouteTemplate: `/watch/[id]`;
    }
  }
}
