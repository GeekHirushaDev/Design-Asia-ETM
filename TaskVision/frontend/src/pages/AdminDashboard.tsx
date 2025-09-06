import React from 'react';
import Page from '../components/shared/Page';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();

  const stats = [
    { name: 'Total Employees', value: '24', change: '+2.1%', changeType: 'increase' },
    { name: 'Active Tasks', value: '156', change: '+12.5%', changeType: 'increase' },
    { name: 'Completed Today', value: '23', change: '+3.2%', changeType: 'increase' },
    { name: 'Hours Tracked', value: '186.5', change: '-1.2%', changeType: 'decrease' },
  ];

  const recentTasks = [
    { id: 1, title: 'Update client proposal', assignee: 'John Doe', status: 'In Progress', priority: 'High' },
    { id: 2, title: 'Review code changes', assignee: 'Jane Smith', status: 'Completed', priority: 'Medium' },
    { id: 3, title: 'Setup new project', assignee: 'Mike Johnson', status: 'Not Started', priority: 'Low' },
  ];

  return (
    <Page
      title="Admin Dashboard"
      description={`Welcome back, ${user?.firstName}! Here's what's happening with your team today.`}
    >
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((item) => (
            <div key={item.name} className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">{item.name}</dt>
                      <dd className="text-lg font-medium text-gray-900">{item.value}</dd>
                    </dl>
                  </div>
                  <div className={`flex items-center ${
                    item.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    <span className="text-sm font-medium">{item.change}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <button className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700">
                Add Employee
              </button>
              <button className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700">
                Create Task
              </button>
              <button className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                View Reports
              </button>
              <button className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700">
                Settings
              </button>
            </div>
          </div>
        </div>

        {/* Recent Tasks */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Recent Tasks</h3>
            <div className="flow-root">
              <ul className="-my-5 divide-y divide-gray-200">
                {recentTasks.map((task) => (
                  <li key={task.id} className="py-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                        <p className="text-sm text-gray-500">{task.assignee}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          task.status === 'Completed' ? 'bg-green-100 text-green-800' :
                          task.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {task.status}
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          task.priority === 'High' ? 'bg-red-100 text-red-800' :
                          task.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {task.priority}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Team Activity */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Team Activity</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium text-white">JD</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">John Doe completed "Client Meeting"</p>
                    <p className="text-xs text-gray-500">2 minutes ago</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium text-white">JS</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">Jane Smith started "Code Review"</p>
                    <p className="text-xs text-gray-500">15 minutes ago</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 bg-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium text-white">MJ</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">Mike Johnson clocked in</p>
                    <p className="text-xs text-gray-500">1 hour ago</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Location Overview</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Online Employees</span>
                  <span className="text-sm font-medium text-green-600">18/24</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">On Field</span>
                  <span className="text-sm font-medium text-blue-600">12</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">In Office</span>
                  <span className="text-sm font-medium text-gray-600">6</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Offline</span>
                  <span className="text-sm font-medium text-red-600">6</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
};

export default AdminDashboard;
