export default function AnalyticsPage() {
    const stats = [
        { label: 'Total Conversations', value: '12,456', change: '+18%', trend: 'up' },
        { label: 'Avg Response Time', value: '1.4s', change: '-0.3s', trend: 'up' },
        { label: 'Resolution Rate', value: '94.2%', change: '+2.1%', trend: 'up' },
        { label: 'Customer Satisfaction', value: '4.8/5', change: '+0.2', trend: 'up' },
    ];

    const botPerformance = [
        { name: 'Booking Assistant', conversations: 5234, resolution: 96, satisfaction: 4.9 },
        { name: 'FAQ Bot', conversations: 4567, resolution: 94, satisfaction: 4.7 },
        { name: 'Order Tracking', conversations: 2655, resolution: 92, satisfaction: 4.8 },
    ];

    return (
        <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, index) => (
                    <div key={index} className="bg-white rounded-xl p-6 border border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm text-gray-600">{stat.label}</p>
                            <span className={`text-sm font-medium ${stat.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                                {stat.change}
                            </span>
                        </div>
                        <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Conversations Over Time */}
                <div className="bg-white rounded-xl p-6 border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Conversations Over Time</h3>
                    <div className="h-64 flex items-end justify-between gap-2">
                        {[45, 62, 58, 71, 68, 82, 79].map((height, index) => (
                            <div key={index} className="flex-1 flex flex-col items-center gap-2">
                                <div
                                    className="w-full bg-gradient-to-t from-primary-blue to-primary-cyan rounded-t-lg transition-all hover:opacity-80"
                                    style={{ height: `${height}%` }}
                                ></div>
                                <span className="text-xs text-gray-500">
                                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index]}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Bot Performance */}
                <div className="bg-white rounded-xl p-6 border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Bot Performance</h3>
                    <div className="space-y-4">
                        {botPerformance.map((bot, index) => (
                            <div key={index}>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-medium text-gray-900">{bot.name}</span>
                                    <span className="text-sm text-gray-600">{bot.conversations} conversations</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex-1">
                                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-primary-blue to-primary-cyan"
                                                style={{ width: `${bot.resolution}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                    <span className="text-sm font-medium text-gray-900">{bot.resolution}%</span>
                                    <span className="text-sm text-yellow-500">★ {bot.satisfaction}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Peak Hours */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Peak Hours</h3>
                <div className="grid grid-cols-12 gap-2">
                    {Array.from({ length: 24 }, (_, i) => {
                        const activity = Math.random() * 100;
                        return (
                            <div key={i} className="text-center">
                                <div
                                    className={`h-16 rounded-lg mb-1 ${activity > 70
                                            ? 'bg-red-500'
                                            : activity > 40
                                                ? 'bg-yellow-500'
                                                : 'bg-green-500'
                                        }`}
                                    style={{ opacity: activity / 100 }}
                                ></div>
                                <span className="text-xs text-gray-500">{i}h</span>
                            </div>
                        );
                    })}
                </div>
                <div className="flex items-center justify-center gap-6 mt-4">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded"></div>
                        <span className="text-sm text-gray-600">Low</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                        <span className="text-sm text-gray-600">Medium</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-500 rounded"></div>
                        <span className="text-sm text-gray-600">High</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
