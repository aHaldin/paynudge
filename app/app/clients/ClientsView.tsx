'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { HelperText } from '@/components/ui/HelperText';
import { Input } from '@/components/ui/Input';
import { ClientForm } from '@/components/forms/ClientForm';
import { deleteClientAction, updateClientAction } from '@/app/app/clients/actions';

type Client = {
  id: string;
  name: string;
  email: string;
  company_name: string | null;
  notes: string | null;
};

type TabKey = 'details' | 'add';

type ClientsViewProps = {
  initialClients: Client[];
};

export function ClientsView({ initialClients }: ClientsViewProps) {
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialClients[0]?.id ?? null
  );
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<TabKey>('details');
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState({
    name: '',
    email: '',
    companyName: '',
    notes: ''
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === selectedId) ?? null,
    [clients, selectedId]
  );

  const filteredClients = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return clients;
    }
    return clients.filter((client) => {
      const haystack = [
        client.name,
        client.email,
        client.company_name ?? ''
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [clients, search]);

  useEffect(() => {
    if (clients.length === 0) {
      setSelectedId(null);
      setActiveTab('details');
      return;
    }
    if (selectedId && clients.some((client) => client.id === selectedId)) {
      return;
    }
    setSelectedId(clients[0].id);
  }, [clients, selectedId]);

  useEffect(() => {
    if (!selectedClient) {
      setIsEditing(false);
      return;
    }
    setEditValues({
      name: selectedClient.name,
      email: selectedClient.email,
      companyName: selectedClient.company_name ?? '',
      notes: selectedClient.notes ?? ''
    });
    setIsEditing(false);
  }, [selectedClient?.id]);

  const handleSave = () => {
    if (!selectedClient) return;
    startTransition(async () => {
      const result = await updateClientAction({
        id: selectedClient.id,
        name: editValues.name,
        email: editValues.email,
        companyName: editValues.companyName,
        notes: editValues.notes
      });
      if (result.error) {
        return;
      }
      if (result.client) {
        setClients((prev) =>
          prev.map((client) =>
            client.id === result.client.id ? result.client : client
          )
        );
        setIsEditing(false);
      }
    });
  };

  const handleDelete = () => {
    if (!selectedClient) return;
    startTransition(async () => {
      const result = await deleteClientAction(selectedClient.id);
      if (result.error) {
        return;
      }
      setClients((prev) =>
        prev.filter((client) => client.id !== selectedClient.id)
      );
      setShowDeleteConfirm(false);
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
      <Card title="Clients">
        <div className="space-y-4">
          <Input
            placeholder="Search clients..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          {clients.length === 0 ? (
            <p className="text-sm text-slate-500">No clients yet.</p>
          ) : filteredClients.length === 0 ? (
            <p className="text-sm text-slate-500">
              No clients match your search.
            </p>
          ) : (
            <div className="space-y-3">
              {filteredClients.map((client) => {
                const isSelected = client.id === selectedId;
                return (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(client.id);
                      setActiveTab('details');
                    }}
                    className={[
                      'w-full rounded-lg border p-4 text-left transition',
                      isSelected
                        ? 'border-ink bg-slate-50'
                        : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                    ].join(' ')}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-sm font-semibold text-ink">
                          {client.name}
                        </h3>
                        <p className="text-sm text-slate-500">{client.email}</p>
                        {client.company_name ? (
                          <p className="text-xs text-slate-400">
                            {client.company_name}
                          </p>
                        ) : null}
                      </div>
                      {isSelected ? (
                        <span className="rounded-full bg-ink px-2 py-1 text-xs font-semibold text-white">
                          Selected
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      <Card>
        <div className="space-y-5">
          <div className="flex items-center gap-2 rounded-lg bg-slate-50 p-1">
            <button
              type="button"
              className={[
                'flex-1 rounded-md px-3 py-2 text-sm font-semibold transition',
                activeTab === 'details'
                  ? 'bg-white text-ink shadow-sm'
                  : 'text-slate-500 hover:text-ink'
              ].join(' ')}
              onClick={() => setActiveTab('details')}
            >
              Client details
            </button>
            <button
              type="button"
              className={[
                'flex-1 rounded-md px-3 py-2 text-sm font-semibold transition',
                activeTab === 'add'
                  ? 'bg-white text-ink shadow-sm'
                  : 'text-slate-500 hover:text-ink'
              ].join(' ')}
              onClick={() => setActiveTab('add')}
            >
              Add client
            </button>
          </div>

          {activeTab === 'details' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-ink">
                    Client details
                  </h2>
                  <p className="text-sm text-slate-500">
                    View and manage client information.
                  </p>
                </div>
                {selectedClient ? (
                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => setIsEditing(false)}
                          disabled={isPending}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          onClick={handleSave}
                          disabled={isPending}
                        >
                          {isPending ? 'Saving...' : 'Save'}
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => setIsEditing(true)}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => setShowDeleteConfirm(true)}
                        >
                          Delete
                        </Button>
                      </>
                    )}
                  </div>
                ) : null}
              </div>

              {selectedClient ? (
                <div className="space-y-4 rounded-lg border border-slate-100 bg-white p-4">
                  <div className="grid gap-4">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase text-slate-400">
                        Name
                      </p>
                      {isEditing ? (
                        <Input
                          value={editValues.name}
                          onChange={(event) =>
                            setEditValues((prev) => ({
                              ...prev,
                              name: event.target.value
                            }))
                          }
                        />
                      ) : (
                        <p className="text-sm font-semibold text-ink">
                          {selectedClient.name}
                        </p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase text-slate-400">
                        Email
                      </p>
                      {isEditing ? (
                        <Input
                          type="email"
                          value={editValues.email}
                          onChange={(event) =>
                            setEditValues((prev) => ({
                              ...prev,
                              email: event.target.value
                            }))
                          }
                        />
                      ) : (
                        <p className="text-sm text-slate-600">
                          {selectedClient.email}
                        </p>
                      )}
                      <HelperText>Used for reminders</HelperText>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase text-slate-400">
                        Company
                      </p>
                      {isEditing ? (
                        <Input
                          value={editValues.companyName}
                          onChange={(event) =>
                            setEditValues((prev) => ({
                              ...prev,
                              companyName: event.target.value
                            }))
                          }
                        />
                      ) : (
                        <p className="text-sm text-slate-600">
                          {selectedClient.company_name || 'None'}
                        </p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase text-slate-400">
                        Notes
                      </p>
                      {isEditing ? (
                        <textarea
                          rows={4}
                          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-ink focus:ring-2 focus:ring-slate-100"
                          value={editValues.notes}
                          onChange={(event) =>
                            setEditValues((prev) => ({
                              ...prev,
                              notes: event.target.value
                            }))
                          }
                        />
                      ) : (
                        <p className="text-sm text-slate-600">
                          {selectedClient.notes || 'None'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center">
                  <p className="text-sm font-semibold text-ink">
                    Select a client to view details
                  </p>
                  <p className="text-sm text-slate-500">
                    Or add a new client to get started.
                  </p>
                  <Button
                    type="button"
                    className="mt-4"
                    onClick={() => setActiveTab('add')}
                  >
                    Add new client
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-ink">Add client</h2>
                <p className="text-sm text-slate-500">
                  Capture the basics to keep projects moving.
                </p>
              </div>
              <ClientForm
                onCreated={(client) => {
                  setClients((prev) => [client, ...prev]);
                  setSelectedId(client.id);
                  setActiveTab('details');
                }}
              />
            </div>
          )}
        </div>
      </Card>

      {showDeleteConfirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-ink">Delete client</h3>
            <p className="mt-2 text-sm text-slate-500">
              This permanently removes the client and their details.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="button" onClick={handleDelete} disabled={isPending}>
                {isPending ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
