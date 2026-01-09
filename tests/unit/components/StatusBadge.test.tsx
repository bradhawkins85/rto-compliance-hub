import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from '@/components/StatusBadge';

describe('StatusBadge Component', () => {
  it('should render compliant status with icon', () => {
    render(<StatusBadge status="compliant" />);
    
    const badge = screen.getByText('Compliant');
    expect(badge).toBeInTheDocument();
  });

  it('should render due status with correct text', () => {
    render(<StatusBadge status="due" />);
    
    const badge = screen.getByText('Due Soon');
    expect(badge).toBeInTheDocument();
  });

  it('should render overdue status', () => {
    render(<StatusBadge status="overdue" />);
    
    const badge = screen.getByText('Overdue');
    expect(badge).toBeInTheDocument();
  });

  it('should render incomplete status', () => {
    render(<StatusBadge status="incomplete" />);
    
    const badge = screen.getByText('Incomplete');
    expect(badge).toBeInTheDocument();
  });

  it('should hide icon when showIcon is false', () => {
    const { container } = render(<StatusBadge status="compliant" showIcon={false} />);
    
    const badge = screen.getByText('Compliant');
    expect(badge).toBeInTheDocument();
    
    // Icon should not be rendered (no svg element before text)
    const svg = container.querySelector('svg');
    expect(svg).toBeNull();
  });

  it('should show icon by default', () => {
    const { container } = render(<StatusBadge status="compliant" />);
    
    const badge = screen.getByText('Compliant');
    expect(badge).toBeInTheDocument();
    
    // Icon should be rendered
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('should apply correct CSS class for compliant status', () => {
    const { container } = render(<StatusBadge status="compliant" />);
    
    const badge = container.querySelector('.bg-success');
    expect(badge).toBeInTheDocument();
  });

  it('should apply correct CSS class for overdue status', () => {
    const { container } = render(<StatusBadge status="overdue" />);
    
    const badge = container.querySelector('.bg-destructive');
    expect(badge).toBeInTheDocument();
  });

  it('should render all status types', () => {
    const statuses: Array<'compliant' | 'due' | 'overdue' | 'incomplete'> = [
      'compliant',
      'due',
      'overdue',
      'incomplete',
    ];
    
    const labels = {
      compliant: 'Compliant',
      due: 'Due Soon',
      overdue: 'Overdue',
      incomplete: 'Incomplete',
    };
    
    statuses.forEach((status) => {
      const { unmount } = render(<StatusBadge status={status} />);
      const badge = screen.getByText(labels[status]);
      expect(badge).toBeInTheDocument();
      unmount();
    });
  });
});
