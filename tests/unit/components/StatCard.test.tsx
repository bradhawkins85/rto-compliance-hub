import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatCard } from '@/components/StatCard';

describe('StatCard Component', () => {
  it('should render title and value', () => {
    render(<StatCard title="Total Policies" value={42} />);
    
    expect(screen.getByText('Total Policies')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('should render string value', () => {
    render(<StatCard title="Status" value="Compliant" />);
    
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Compliant')).toBeInTheDocument();
  });

  it('should render subtitle when provided', () => {
    render(
      <StatCard 
        title="Policies" 
        value={42} 
        subtitle="Last updated today" 
      />
    );
    
    expect(screen.getByText('Policies')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('Last updated today')).toBeInTheDocument();
  });

  it('should not render subtitle when not provided', () => {
    render(<StatCard title="Policies" value={42} />);
    
    expect(screen.queryByText(/Last updated/)).not.toBeInTheDocument();
  });

  it('should render icon when provided', () => {
    const icon = <span data-testid="test-icon">📊</span>;
    render(<StatCard title="Policies" value={42} icon={icon} />);
    
    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
  });

  it('should apply default variant styles', () => {
    const { container } = render(<StatCard title="Policies" value={42} />);
    
    const card = container.querySelector('.border-border');
    expect(card).toBeInTheDocument();
  });

  it('should apply warning variant styles', () => {
    const { container } = render(
      <StatCard title="Policies" value={42} variant="warning" />
    );
    
    const card = container.querySelector('.border-accent\\/40');
    expect(card).toBeInTheDocument();
  });

  it('should apply success variant styles', () => {
    const { container } = render(
      <StatCard title="Policies" value={42} variant="success" />
    );
    
    const card = container.querySelector('.border-success\\/40');
    expect(card).toBeInTheDocument();
  });

  it('should apply danger variant styles', () => {
    const { container } = render(
      <StatCard title="Policies" value={42} variant="danger" />
    );
    
    const card = container.querySelector('.border-destructive\\/40');
    expect(card).toBeInTheDocument();
  });

  it('should render large numbers correctly', () => {
    render(<StatCard title="Total Users" value={1234567} />);
    
    expect(screen.getByText('1234567')).toBeInTheDocument();
  });

  it('should render zero value', () => {
    render(<StatCard title="Errors" value={0} />);
    
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('should render all props together', () => {
    const icon = <span data-testid="icon">📈</span>;
    render(
      <StatCard
        title="Total Revenue"
        value="$45,678"
        subtitle="Up 12% from last month"
        icon={icon}
        trend="up"
        variant="success"
      />
    );
    
    expect(screen.getByText('Total Revenue')).toBeInTheDocument();
    expect(screen.getByText('$45,678')).toBeInTheDocument();
    expect(screen.getByText('Up 12% from last month')).toBeInTheDocument();
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('should have hover effect styles', () => {
    const { container } = render(<StatCard title="Policies" value={42} />);
    
    const card = container.querySelector('.hover\\:shadow-md');
    expect(card).toBeInTheDocument();
  });
});
