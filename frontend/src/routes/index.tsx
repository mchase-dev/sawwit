import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { ProtectedRoute, PublicRoute } from '../components';
import {
  LoginPage,
  RegisterPage,
  HomePage,
  TopicsListPage,
  TopicPage,
  TopicModerationPage,
  PostDetailPage,
  UserProfilePage,
  UserSettingsPage,
  NotificationsPage,
  SearchPage,
  MessagesPage,
  ConversationPage,
  AllFeedPage,
  PrivacyPage,
  TermsPage,
  CookiePolicyPage,
  CommunityRulesPage,
  ContactPage,
  ModQueuePage,
  ModLogPage,
  AutomodPage,
  BlockedUsersPage,
  AdminDashboardPage,
} from '../pages';

const NotFoundPage = () => <div>404 - Page Not Found</div>;

const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '/all',
    element: <AllFeedPage />,
  },
  {
    path: '/login',
    element: (
      <PublicRoute redirectIfAuthenticated>
        <LoginPage />
      </PublicRoute>
    ),
  },
  {
    path: '/register',
    element: (
      <PublicRoute redirectIfAuthenticated>
        <RegisterPage />
      </PublicRoute>
    ),
  },
  {
    path: '/topics',
    element: <TopicsListPage />,
  },
  {
    path: '/t/:topicName',
    element: <TopicPage />,
  },
  {
    path: '/t/:topicName/moderate',
    element: (
      <ProtectedRoute>
        <TopicModerationPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/t/:topicName/post/:postId',
    element: <PostDetailPage />,
  },
  {
    path: '/u/:username',
    element: <UserProfilePage />,
  },
  {
    path: '/search',
    element: <SearchPage />,
  },
  {
    path: '/settings',
    element: (
      <ProtectedRoute>
        <UserSettingsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/messages',
    element: (
      <ProtectedRoute>
        <MessagesPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/messages/:username',
    element: (
      <ProtectedRoute>
        <ConversationPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/notifications',
    element: (
      <ProtectedRoute>
        <NotificationsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/settings/blocked',
    element: (
      <ProtectedRoute>
        <BlockedUsersPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/t/:topicName/modqueue',
    element: (
      <ProtectedRoute>
        <ModQueuePage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/t/:topicName/modlog',
    element: <ModLogPage />,
  },
  {
    path: '/t/:topicName/automod',
    element: (
      <ProtectedRoute>
        <AutomodPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin',
    element: (
      <ProtectedRoute requireAdmin>
        <AdminDashboardPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/reports',
    element: (
      <ProtectedRoute requireAdmin>
        <ModQueuePage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/modlog',
    element: (
      <ProtectedRoute requireAdmin>
        <ModLogPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/privacy',
    element: <PrivacyPage />,
  },
  {
    path: '/terms',
    element: <TermsPage />,
  },
  {
    path: '/cookie-policy',
    element: <CookiePolicyPage />,
  },
  {
    path: '/community-rules',
    element: <CommunityRulesPage />,
  },
  {
    path: '/contact',
    element: <ContactPage />,
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);

export const AppRouter: React.FC = () => {
  return <RouterProvider router={router} />;
};

export default router;
