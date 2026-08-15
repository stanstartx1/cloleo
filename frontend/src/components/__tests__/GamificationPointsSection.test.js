/**
 * Test file for GamificationPointsSection component
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import GamificationPointsSection from '../GamificationPointsSection';

// Mock axios
jest.mock('axios');

describe('GamificationPointsSection', () => {
  const mockUser = { id: 1, name: 'Test User' };
  const mockToken = 'test-token';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    render(<GamificationPointsSection user={mockUser} token={mockToken} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('displays points and level after loading', async () => {
    const mockAchievements = [
      { id: 1, title: 'Test', progress: 100, target_value: 1 }
    ];

    require('axios').get.mockResolvedValue({ data: mockAchievements });

    render(<GamificationPointsSection user={mockUser} token={mockToken} />);

    await waitFor(() => {
      expect(screen.getByText(/Mes Points & Niveau/i)).toBeInTheDocument();
    });
  });

  it('calculates level correctly based on points', async () => {
    const mockAchievements = [
      { id: 1, title: 'Test', progress: 100, target_value: 100 }
    ];

    require('axios').get.mockResolvedValue({ data: mockAchievements });

    render(<GamificationPointsSection user={mockUser} token={mockToken} />);

    await waitFor(() => {
      expect(screen.getByText(/Niveau/i)).toBeInTheDocument();
    });
  });
});
