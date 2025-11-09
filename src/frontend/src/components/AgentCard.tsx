import { useState } from 'react';
import { Agent } from '../App';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { MoreVertical, Edit, Trash2, Eye } from 'lucide-react';
import { EditAgentDialog } from './EditAgentDialog';
import { ViewAgentDialog } from './ViewAgentDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';

interface AgentCardProps {
  agent: Agent;
  onUpdate: (agent: Agent) => void;
  onDelete: (id: string) => void;
}

export function AgentCard({ agent, onUpdate, onDelete }: AgentCardProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  return (
    <>
      <Card className="hover:shadow-lg transition-shadow duration-200 cursor-pointer group">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1" onClick={() => setIsViewDialogOpen(true)}>
              <Badge variant="secondary" className="mb-2">
                {agent.category}
              </Badge>
              <CardTitle className="mb-2">{agent.name}</CardTitle>
              <CardDescription>{agent.description}</CardDescription>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsViewDialogOpen(true)}>
                  <Eye className="w-4 h-4 mr-2" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setIsDeleteDialogOpen(true)}
                  className="text-red-600"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent onClick={() => setIsViewDialogOpen(true)}>
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
            <p className="text-slate-700 line-clamp-3">{agent.prompt}</p>
          </div>
        </CardContent>
      </Card>

      <EditAgentDialog
        agent={agent}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onUpdateAgent={onUpdate}
      />

      <ViewAgentDialog
        agent={agent}
        open={isViewDialogOpen}
        onOpenChange={setIsViewDialogOpen}
        onEdit={() => {
          setIsViewDialogOpen(false);
          setIsEditDialogOpen(true);
        }}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the agent "{agent.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onDelete(agent.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
