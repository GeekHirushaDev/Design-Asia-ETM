import React from 'react';
import Page from '../components/shared/Page';
import { useAuth } from '../context/AuthContext';

const EmployeeDashboard: React.FC = () => {
  const { user } = useAuth();

  const myTasks = [
    { id: 1, title: 'Update client proposal', status: 'In Progress', priority: 'High', dueDate: '2024-01-15' },
    { id: 2, title: 'Review project requirements', status: 'Not Started', priority: 'Medium', dueDate: '2024-01-16' },
    { id: 3, title: 'Prepare presentation', status: 'Completed', priority: 'Low', dueDate: '2024-01-14' },
  ];

  const todayStats = {
    clockedIn: '09:00 AM',
    hoursWorked: '6.5',
    tasksCompleted: 2,
    currentLocation: 'Office Building A'
  };

  return (
    <Page
      title="Employee Dashboard"
      description={`Welcome back, ${user?.firstName}! Here's your workspace for today.`}
    >
      <div className="space-y-6">
        {/* Today's Stats */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Clocked In</dt>
                    <dd className="text-lg font-medium text-gray-900">{todayStats.clockedIn}</dd>
                  </dl>
                </div>
                <div className="flex items-center text-green-600">
                  <div className="h-2 w-2 bg-green-600 rounded-full mr-2"></div>
                  <span className="text-sm">Active</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Hours Worked</dt>
                    <dd className="text-lg font-medium text-gray-900">{todayStats.hoursWorked}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Tasks Completed</dt>
                    <dd className="text-lg font-medium text-gray-900">{todayStats.tasksCompleted}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Location</dt>
                    <dd className="text-lg font-medium text-gray-900">{todayStats.currentLocation}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <button className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700">
                Clock In/Out
              </button>
              <button className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                Start Task
              </button>
              <button className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700">
                Update Location
              </button>
              <button className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700">
                Break Time
              </button>
            </div>
          </div>
        </div>

        {/* My Tasks */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900">My Tasks</h3>
              <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                View All
              </button>
            </div>
            <div className="flow-root">
              <ul className="-my-5 divide-y divide-gray-200">
                {myTasks.map((task) => (
                  <li key={task.id} className="py-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                        <p className="text-sm text-gray-500">Due: {task.dueDate}</p>
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

        {/* Recent Activity & Schedule */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Today's Schedule</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">Team Meeting</p>
                    <p className="text-xs text-gray-500">10:00 AM - 11:00 AM</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">Client Presentation</p>
                    <p className="text-xs text-gray-500">2:00 PM - 3:00 PM</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="h-2 w-2 bg-purple-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">Project Review</p>
                    <p className="text-xs text-gray-500">4:00 PM - 5:00 PM</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Recent Activity</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">Completed "Review documents"</p>
                    <p className="text-xs text-gray-500">30 minutes ago</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">Started "Update client proposal"</p>
                    <p className="text-xs text-gray-500">2 hours ago</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="h-2 w-2 bg-gray-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">Clocked in</p>
                    <p className="text-xs text-gray-500">6.5 hours ago</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
};

export default EmployeeDashboard;
