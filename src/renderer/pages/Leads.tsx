import React, { useEffect, useState, useMemo } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  type SortingState
} from '@tanstack/react-table'
import { GlassCard } from '@/components/layout/GlassCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import type { Lead, Niche } from '@/lib/types'
import {
  Upload,
  Plus,
  Search,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Shield
} from 'lucide-react'

const columnHelper = createColumnHelper<Lead>()

export default function Leads() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [niches, setNiches] = useState<Niche[]>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [nicheFilter, setNicheFilter] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showNicheDialog, setShowNicheDialog] = useState(false)
  const [newNiche, setNewNiche] = useState({ name: '', color: '#06b6d4' })
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [newLead, setNewLead] = useState({ first_name: '', last_name: '', email: '', company: '', website: '', niche_id: '' })
  const [validating, setValidating] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const [l, n] = await Promise.all([
      window.electronAPI.leads.getAll(),
      window.electronAPI.niches.getAll()
    ])
    setLeads(l as Lead[])
    setNiches(n as Niche[])
  }

  const handleImportCSV = async () => {
    const result = await window.electronAPI.leads.importCSV(nicheFilter || undefined)
    if (!result.canceled) {
      loadData()
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return
    await window.electronAPI.leads.deleteBatch([...selectedIds])
    setSelectedIds(new Set())
    loadData()
  }

  const handleValidateSelected = async () => {
    if (selectedIds.size === 0) return
    setValidating(true)
    try {
      await window.electronAPI.validation.validateLeads([...selectedIds])
      loadData()
    } finally {
      setValidating(false)
    }
  }

  const handleCreateNiche = async () => {
    if (!newNiche.name) return
    await window.electronAPI.niches.create(newNiche)
    setNewNiche({ name: '', color: '#06b6d4' })
    setShowNicheDialog(false)
    loadData()
  }

  const handleAddLead = async () => {
    if (!newLead.first_name || !newLead.email) return
    await window.electronAPI.leads.create({
      ...newLead,
      niche_id: newLead.niche_id || undefined
    })
    setNewLead({ first_name: '', last_name: '', email: '', company: '', website: '', niche_id: '' })
    setShowAddDialog(false)
    loadData()
  }

  const filteredLeads = useMemo(() => {
    let result = leads
    if (nicheFilter) {
      result = result.filter((l) => l.niche_id === nicheFilter)
    }
    return result
  }, [leads, nicheFilter])

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: 'select',
        header: () => (
          <input
            type="checkbox"
            className="rounded"
            checked={selectedIds.size === filteredLeads.length && filteredLeads.length > 0}
            onChange={(e) => {
              if (e.target.checked) {
                setSelectedIds(new Set(filteredLeads.map((l) => l.id)))
              } else {
                setSelectedIds(new Set())
              }
            }}
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            className="rounded"
            checked={selectedIds.has(row.original.id)}
            onChange={(e) => {
              const next = new Set(selectedIds)
              if (e.target.checked) next.add(row.original.id)
              else next.delete(row.original.id)
              setSelectedIds(next)
            }}
          />
        ),
        size: 40
      }),
      columnHelper.accessor('first_name', {
        header: 'Name',
        cell: ({ row }) => (
          <span className="font-medium">
            {row.original.first_name} {row.original.last_name || ''}
          </span>
        )
      }),
      columnHelper.accessor('email', { header: 'Email' }),
      columnHelper.accessor('company', {
        header: 'Company',
        cell: ({ getValue }) => getValue() || <span className="text-zinc-600">—</span>
      }),
      columnHelper.accessor('niche_name', {
        header: 'Niche',
        cell: ({ row }) =>
          row.original.niche_name ? (
            <Badge
              style={{
                background: `${row.original.niche_color}15`,
                color: row.original.niche_color || '#06b6d4',
                borderColor: `${row.original.niche_color}30`
              }}
            >
              {row.original.niche_name}
            </Badge>
          ) : (
            <span className="text-zinc-600">—</span>
          )
      }),
      columnHelper.accessor('email_valid', {
        header: 'Valid',
        cell: ({ row }) => {
          if (row.original.email_valid === 1)
            return <CheckCircle className="w-4 h-4 text-green-400" />
          if (row.original.email_validation_error)
            return (
              <span title={row.original.email_validation_error}>
                <XCircle className="w-4 h-4 text-red-400" />
              </span>
            )
          return <AlertCircle className="w-4 h-4 text-zinc-600" />
        },
        size: 60
      }),
      columnHelper.accessor('status', {
        header: 'Status',
        cell: ({ getValue }) => {
          const s = getValue()
          const variant =
            s === 'interested' ? 'success' : s === 'not_interested' ? 'destructive' : 'secondary'
          return <Badge variant={variant}>{s}</Badge>
        }
      })
    ],
    [selectedIds, filteredLeads]
  )

  const table = useReactTable({
    data: filteredLeads,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel()
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Leads</h1>
          <p className="text-zinc-400 text-sm mt-1">{leads.length} total leads</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowNicheDialog(true)}>
            <Plus className="w-3 h-3" /> Niche
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowAddDialog(true)}>
            <Plus className="w-3 h-3" /> Add Lead
          </Button>
          <Button size="sm" onClick={handleImportCSV}>
            <Upload className="w-3 h-3" /> Import CSV
          </Button>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
          <Input
            placeholder="Search leads..."
            className="pl-9"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
          />
        </div>
        <Select
          value={nicheFilter}
          onChange={(e) => setNicheFilter(e.target.value)}
          className="w-48"
        >
          <option value="">All Niches</option>
          {niches.map((n) => (
            <option key={n.id} value={n.id}>{n.name}</option>
          ))}
        </Select>
        {selectedIds.size > 0 && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={handleValidateSelected}
              disabled={validating}
            >
              <Shield className="w-3 h-3" />
              {validating ? 'Validating...' : `Validate (${selectedIds.size})`}
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDeleteSelected}>
              <Trash2 className="w-3 h-3" /> Delete ({selectedIds.size})
            </Button>
          </>
        )}
      </div>

      {/* Table */}
      <GlassCard className="p-0 overflow-hidden">
        <table className="w-full">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-white/5">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                    style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-12 text-zinc-500">
                  No leads yet. Import a CSV or add leads manually.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 text-sm">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </GlassCard>

      {/* Create Niche Dialog */}
      <Dialog open={showNicheDialog} onOpenChange={setShowNicheDialog}>
        <DialogContent onClose={() => setShowNicheDialog(false)}>
          <DialogHeader>
            <DialogTitle>Create Niche</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Niche name (e.g., Real Estate)"
              value={newNiche.name}
              onChange={(e) => setNewNiche({ ...newNiche, name: e.target.value })}
            />
            <div className="flex items-center gap-2">
              <label className="text-sm text-zinc-400">Color:</label>
              <input
                type="color"
                value={newNiche.color}
                onChange={(e) => setNewNiche({ ...newNiche, color: e.target.value })}
                className="w-8 h-8 rounded cursor-pointer"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNicheDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateNiche}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Lead Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent onClose={() => setShowAddDialog(false)}>
          <DialogHeader>
            <DialogTitle>Add Lead</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="First name *" value={newLead.first_name} onChange={(e) => setNewLead({ ...newLead, first_name: e.target.value })} />
              <Input placeholder="Last name" value={newLead.last_name} onChange={(e) => setNewLead({ ...newLead, last_name: e.target.value })} />
            </div>
            <Input placeholder="Email *" type="email" value={newLead.email} onChange={(e) => setNewLead({ ...newLead, email: e.target.value })} />
            <Input placeholder="Company" value={newLead.company} onChange={(e) => setNewLead({ ...newLead, company: e.target.value })} />
            <Input placeholder="Website" value={newLead.website} onChange={(e) => setNewLead({ ...newLead, website: e.target.value })} />
            <Select value={newLead.niche_id} onChange={(e) => setNewLead({ ...newLead, niche_id: e.target.value })}>
              <option value="">No Niche</option>
              {niches.map((n) => (
                <option key={n.id} value={n.id}>{n.name}</option>
              ))}
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleAddLead}>Add Lead</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
