import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { SearchableSelect } from './searchable-select';

const mockOptions = [
  { value: '1', label: 'Jahresplanung' },
  { value: '2', label: 'P25-1322 Sanierung Stuttgart' },
  { value: '3', label: 'P25-22 Umbau Köln' },
  { value: '4', label: 'P25-5700 Mehrfamilienhaus Hamburg' },
];

describe('SearchableSelect', () => {
  it('renders with placeholder when no value is selected', () => {
    render(
      <SearchableSelect
        value={null}
        onValueChange={vi.fn()}
        options={mockOptions}
        placeholder="Projekt auswählen..."
      />
    );

    expect(screen.getByRole('combobox')).toHaveTextContent(
      'Projekt auswählen...'
    );
  });

  it('renders with selected value label', () => {
    render(
      <SearchableSelect
        value="2"
        onValueChange={vi.fn()}
        options={mockOptions}
        placeholder="Projekt auswählen..."
      />
    );

    expect(screen.getByRole('combobox')).toHaveTextContent(
      'P25-1322 Sanierung Stuttgart'
    );
  });

  it('opens dialog on button click', async () => {
    const user = userEvent.setup();

    render(
      <SearchableSelect
        value={null}
        onValueChange={vi.fn()}
        options={mockOptions}
      />
    );

    await user.click(screen.getByRole('combobox'));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Suchen...')).toBeInTheDocument();
  });

  it('shows all options in the list', async () => {
    const user = userEvent.setup();

    render(
      <SearchableSelect
        value={null}
        onValueChange={vi.fn()}
        options={mockOptions}
      />
    );

    await user.click(screen.getByRole('combobox'));

    expect(screen.getByText('Jahresplanung')).toBeInTheDocument();
    expect(screen.getByText('P25-1322 Sanierung Stuttgart')).toBeInTheDocument();
    expect(screen.getByText('P25-22 Umbau Köln')).toBeInTheDocument();
    expect(
      screen.getByText('P25-5700 Mehrfamilienhaus Hamburg')
    ).toBeInTheDocument();
  });

  it('filters options based on search input', async () => {
    const user = userEvent.setup();

    render(
      <SearchableSelect
        value={null}
        onValueChange={vi.fn()}
        options={mockOptions}
      />
    );

    await user.click(screen.getByRole('combobox'));
    await user.type(screen.getByPlaceholderText('Suchen...'), 'Köln');

    expect(screen.getByText('P25-22 Umbau Köln')).toBeInTheDocument();
    expect(
      screen.queryByText('P25-1322 Sanierung Stuttgart')
    ).not.toBeInTheDocument();
  });

  it('shows empty text when no results match search', async () => {
    const user = userEvent.setup();

    render(
      <SearchableSelect
        value={null}
        onValueChange={vi.fn()}
        options={mockOptions}
        emptyText="Kein Projekt gefunden"
      />
    );

    await user.click(screen.getByRole('combobox'));
    await user.type(screen.getByPlaceholderText('Suchen...'), 'xyz123notfound');

    expect(screen.getByText('Kein Projekt gefunden')).toBeInTheDocument();
  });

  it('calls onValueChange when an option is selected', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    render(
      <SearchableSelect
        value={null}
        onValueChange={onValueChange}
        options={mockOptions}
      />
    );

    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByText('P25-22 Umbau Köln'));

    expect(onValueChange).toHaveBeenCalledWith('3');
  });

  it('closes dialog after selection', async () => {
    const user = userEvent.setup();

    render(
      <SearchableSelect
        value={null}
        onValueChange={vi.fn()}
        options={mockOptions}
      />
    );

    await user.click(screen.getByRole('combobox'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.click(screen.getByText('Jahresplanung'));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows checkmark icon for selected option', async () => {
    const user = userEvent.setup();

    render(
      <SearchableSelect
        value="2"
        onValueChange={vi.fn()}
        options={mockOptions}
      />
    );

    await user.click(screen.getByRole('combobox'));

    // Verify that the selected option is in the list (shown twice: button + list)
    const listItems = screen.getAllByText('P25-1322 Sanierung Stuttgart');
    expect(listItems.length).toBe(2);

    // The list item should have a check icon (svg with lucide-check class)
    const listItem = listItems[1];
    const checkIcon = listItem.parentElement?.querySelector('.lucide-check');
    expect(checkIcon).toBeInTheDocument();
  });

  it('is disabled when disabled prop is true', () => {
    render(
      <SearchableSelect
        value={null}
        onValueChange={vi.fn()}
        options={mockOptions}
        disabled={true}
      />
    );

    expect(screen.getByRole('combobox')).toBeDisabled();
  });

  it('shows clear option when allowClear is true', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    render(
      <SearchableSelect
        value="1"
        onValueChange={onValueChange}
        options={mockOptions}
        allowClear={true}
        clearLabel="Nicht konfiguriert"
      />
    );

    await user.click(screen.getByRole('combobox'));

    expect(screen.getByText('Nicht konfiguriert')).toBeInTheDocument();

    await user.click(screen.getByText('Nicht konfiguriert'));

    expect(onValueChange).toHaveBeenCalledWith(null);
  });

  it('uses custom search placeholder', async () => {
    const user = userEvent.setup();

    render(
      <SearchableSelect
        value={null}
        onValueChange={vi.fn()}
        options={mockOptions}
        searchPlaceholder="Projekt suchen..."
      />
    );

    await user.click(screen.getByRole('combobox'));

    expect(screen.getByPlaceholderText('Projekt suchen...')).toBeInTheDocument();
  });
});
