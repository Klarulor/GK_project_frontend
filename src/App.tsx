import { createRootRoute, createRoute, createRouter, RouterProvider } from '@tanstack/react-router'
import { MainPage } from './pages/MainPage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'

export const IS_AUTHENTICATED: boolean = false;

const rootRoute = createRootRoute()
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => <MainPage />,
  beforeLoad: async () => {
    
  }
})
const routeTree = rootRoute.addChildren([indexRoute,
    createRoute({
        getParentRoute: () => rootRoute,
        path: '/login',
        component: () => <LoginPage />,
    }),
    createRoute({
        getParentRoute: () => rootRoute,
        path: '/register',
        component: () => <RegisterPage />,
    })
])
const router = createRouter({ routeTree })

export function App() {
    
    return <RouterProvider router={router} />
}
