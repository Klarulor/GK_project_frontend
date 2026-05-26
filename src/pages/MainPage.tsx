import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  clearDeviceOverride,
  createUser,
  createDevice,
  deactivateUser,
  deleteUser,
  deleteDevice,
  type AppUser,
  type DeviceCommand,
  type Device,
  type DeviceDraft,
  type Dashboard,
  getDeviceCommands,
  type UserDraft,
  getDashboard,
  getUsers,
  runAutomation,
  sendDeviceCommand,
  testDevice,
  updateDevice,
  updatePreferences,
} from "../api/control";
import { authStorage } from "../storage";

const emptyDevice: DeviceDraft = {
  name: "",
  description: "",
  callbackUrl: "http://localhost:9090/device",
  priceLimit: 100,
  priceLocation: "ee",
  powerKw: 1,
  isCritical: false,
};

const emptyUser: UserDraft = {
  email: "",
  username: "",
  password: "",
};

const EUR_PER_KWH_TO_EUR_PER_MWH = 1000;

function toDisplayFixedPrice(priceEurKwh: number) {
  return priceEurKwh * EUR_PER_KWH_TO_EUR_PER_MWH;
}

function toStoredFixedPrice(priceEurMwh: number) {
  return priceEurMwh / EUR_PER_KWH_TO_EUR_PER_MWH;
}

export function MainPage() {
  const token = authStorage.getToken();
  const preferencesInitializedRef = useRef(false);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [deviceDraft, setDeviceDraft] = useState<DeviceDraft>(emptyDevice);
  const [userDraft, setUserDraft] = useState<UserDraft>(emptyUser);
  const [commandLog, setCommandLog] = useState<DeviceCommand[]>([]);
  const [commandLogTitle, setCommandLogTitle] = useState("Command history");
  const [fixedPrice, setFixedPrice] = useState(0.18);
  const [vacationMode, setVacationMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const decisionsByUid = useMemo(() => {
    return new Map(dashboard?.decisions.map((decision) => [decision.uid, decision]) ?? []);
  }, [dashboard]);

  const loadDashboard = useCallback(async (options: {silent?: boolean; syncPreferences?: boolean} = {}) => {
    if (!token) {
      return;
    }

    if (options.silent) {
      setPolling(true);
    } else {
      setLoading(true);
      setError(null);
    }

    try {
      const nextDashboard = await getDashboard();
      setDashboard(nextDashboard);
      setLastUpdatedAt(new Date());

      if (options.syncPreferences || !preferencesInitializedRef.current) {
        setFixedPrice(toDisplayFixedPrice(nextDashboard.user.fixedPriceEurKwh));
        setVacationMode(nextDashboard.user.vacationMode);
        preferencesInitializedRef.current = true;
      }

      if (nextDashboard.user.role === 1) {
        setUsers(await getUsers());
      } else {
        setUsers([]);
      }
    } catch (err: unknown) {
      if (!options.silent) {
        setError(err instanceof Error ? err.message : "Could not load dashboard");
      }
    } finally {
      if (options.silent) {
        setPolling(false);
      } else {
        setLoading(false);
      }
    }
  }, [token]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadDashboard({syncPreferences: true});
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadDashboard]);

  useEffect(() => {
    if (!token) {
      return;
    }

    const interval = window.setInterval(() => {
      void loadDashboard({silent: true});
    }, 5000);

    return () => window.clearInterval(interval);
  }, [loadDashboard, token]);

  if (!token) {
    return (
      <main className="auth-gate">
        <section>
          <p className="eyebrow">Nutika Elektrivõrgu Juhtimiskeskus</p>
          <h1>Control center for price-aware devices</h1>
          <p className="muted">
            Sign in to manage devices, Nord Pool thresholds, savings reports and vacation mode.
          </p>
          <div className="button-row">
            <Link to="/login" className="primary-link">Login</Link>
            <Link to="/register" className="secondary-link">Register</Link>
          </div>
        </section>
      </main>
    );
  }

  const submitDevice = async (event: FormEvent) => {
    event.preventDefault();
    await runAction(async () => {
      await createDevice(deviceDraft);
      setDeviceDraft(emptyDevice);
      setNotice("Device added");
      await loadDashboard();
    });
  };

  const submitUser = async (event: FormEvent) => {
    event.preventDefault();
    await runAction(async () => {
      await createUser(userDraft);
      setUserDraft(emptyUser);
      setUsers(await getUsers());
      setNotice("User created");
    });
  };

  const savePreferences = async () => {
    await runAction(async () => {
      await updatePreferences(toStoredFixedPrice(fixedPrice), vacationMode);
      setNotice("Preferences saved");
      await loadDashboard({syncPreferences: true});
    });
  };

  const runAction = async (action: () => Promise<void>) => {
    setError(null);
    setNotice(null);
    try {
      await action();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Action failed");
    }
  };

  const logout = () => {
    authStorage.clear();
    window.location.href = "/";
  };

  return (
    <main className="dashboard">
      <header className="topbar">
        <div>
          <p className="eyebrow">Control center</p>
          <h1>Smart grid dashboard</h1>
        </div>
        <div className="button-row">
          <span className={polling ? "refresh-status active" : "refresh-status"}>
            {polling ? "Updating" : `Auto refresh 5s${lastUpdatedAt ? ` · ${formatTime(lastUpdatedAt)}` : ""}`}
          </span>
          <button type="button" onClick={() => void loadDashboard()}>Refresh</button>
          <button type="button" onClick={logout}>Logout</button>
        </div>
      </header>

      {error && <div className="alert error">{error}</div>}
      {notice && <div className="alert success">{notice}</div>}

      <section className="metric-grid">
        <Metric label="Current price" value={dashboard ? `${dashboard.currentPrice.priceEurMwh} EUR/MWh` : "Loading"} />
        <Metric label="Devices" value={String(dashboard?.devices.length ?? 0)} />
        <Metric label="Historical savings" value={dashboard ? `${dashboard.savings.saved.toFixed(2)} EUR` : "0 EUR"} />
        <Metric label="Planned 24h savings" value={dashboard ? `${dashboard.plannedSavings.saved.toFixed(2)} EUR` : "0 EUR"} />
      </section>

      <section className="toolbar">
        <label>
          Fixed package price, EUR/MWh
          <input
            type="number"
            min="0"
            step="0.1"
            value={fixedPrice}
            onChange={(event) => setFixedPrice(Number(event.target.value))}
          />
        </label>
        <label className="toggle">
          <input
            type="checkbox"
            checked={vacationMode}
            onChange={(event) => setVacationMode(event.target.checked)}
          />
          Vacation mode
        </label>
        <button type="button" onClick={() => void savePreferences()}>Save preferences</button>
        <button type="button" onClick={() => void runAction(async () => {
          const result = await runAutomation();
          setNotice(`Automation checked ${result.results.length} devices`);
          await loadDashboard();
        })}>
          Run automation
        </button>
      </section>

      <section className="status-band">
        <div>
          <span>Mode</span>
          <strong>{vacationMode ? "Vacation" : "Automatic"}</strong>
        </div>
        <div>
          <span>Fixed tariff</span>
          <strong>{fixedPrice.toFixed(1)} EUR/MWh</strong>
        </div>
        <div>
          <span>Price area</span>
          <strong>{dashboard?.currentPrice.country.toUpperCase() ?? "EE"}</strong>
        </div>
      </section>

      <section className="split">
        <div>
          <div className="section-head">
            <h2>Devices</h2>
            <span>{loading ? "Syncing" : "Live"}</span>
          </div>
          <div className="device-list">
            {dashboard?.devices.map((device) => (
              <DeviceRow
                key={device.uid}
                device={device}
                decision={decisionsByUid.get(device.uid)}
                onPower={(targetState) => runAction(async () => {
                  await sendDeviceCommand(device.uid, targetState);
                  await loadDashboard();
                })}
                onClear={() => runAction(async () => {
                  await clearDeviceOverride(device.uid);
                  await loadDashboard();
                })}
                onSave={(patch) => runAction(async () => {
                  await updateDevice(device.uid, patch);
                  await loadDashboard();
                })}
                onTest={() => runAction(async () => {
                  const result = await testDevice(device.uid);
                  setNotice(`${device.name} connection: ${result.ok ? "ok" : "failed"}`);
                })}
                onHistory={() => runAction(async () => {
                  setCommandLog(await getDeviceCommands(device.uid));
                  setCommandLogTitle(`${device.name} command history`);
                })}
                onDelete={() => runAction(async () => {
                  await deleteDevice(device.uid);
                  await loadDashboard();
                })}
              />
            ))}
            {!dashboard?.devices.length && <p className="muted">No devices yet.</p>}
          </div>
        </div>

        <form className="device-form" onSubmit={(event) => void submitDevice(event)}>
          <h2>Add device</h2>
          <label>
            Name
            <input value={deviceDraft.name} onChange={(event) => setDeviceDraft({...deviceDraft, name: event.target.value})} required />
          </label>
          <label>
            Description
            <input value={deviceDraft.description} onChange={(event) => setDeviceDraft({...deviceDraft, description: event.target.value})} />
          </label>
          <label>
            Callback URL
            <input value={deviceDraft.callbackUrl} onChange={(event) => setDeviceDraft({...deviceDraft, callbackUrl: event.target.value})} required />
          </label>
          <div className="form-grid">
            <label>
              Threshold
              <input type="number" value={deviceDraft.priceLimit} onChange={(event) => setDeviceDraft({...deviceDraft, priceLimit: Number(event.target.value)})} />
            </label>
            <label>
              Power kW
              <input type="number" min="0" step="0.1" value={deviceDraft.powerKw} onChange={(event) => setDeviceDraft({...deviceDraft, powerKw: Number(event.target.value)})} />
            </label>
          </div>
          <label>
            Price area
            <select value={deviceDraft.priceLocation} onChange={(event) => setDeviceDraft({...deviceDraft, priceLocation: event.target.value as DeviceDraft["priceLocation"]})}>
              <option value="ee">Estonia</option>
              <option value="lv">Latvia</option>
              <option value="lt">Lithuania</option>
              <option value="fi">Finland</option>
            </select>
          </label>
          <label className="toggle">
            <input type="checkbox" checked={deviceDraft.isCritical} onChange={(event) => setDeviceDraft({...deviceDraft, isCritical: event.target.checked})} />
            Critical device
          </label>
          <button type="submit">Add device</button>
        </form>
      </section>

      <section>
        <div className="section-head">
          <h2>Next 24 hours</h2>
          <span>{dashboard?.forecast.length ?? 0} price points</span>
        </div>
        <div className="forecast">
          {dashboard?.forecast.slice(0, 24).map((price) => (
            <div className="forecast-cell" key={price.timestamp}>
              <span>{formatHour(price.localTime)}</span>
              <strong>{price.priceEurMwh}</strong>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="section-head">
          <h2>Savings details</h2>
          <span>Historical fixed vs controlled cost</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Device</th>
                <th>Hour</th>
                <th>Fixed</th>
                <th>Actual</th>
                <th>Saved</th>
              </tr>
            </thead>
            <tbody>
              {dashboard?.savings.rows.slice(0, 12).map((row) => (
                <tr key={`${row.deviceUid}-${row.localTime}`}>
                  <td>{row.deviceName}</td>
                  <td>{formatHour(row.localTime)}</td>
                  <td>{row.fixedCost.toFixed(2)}</td>
                  <td>{row.actualCost.toFixed(2)}</td>
                  <td>{row.saved.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <div className="section-head">
          <h2>{commandLogTitle}</h2>
          <span>{commandLog.length} latest commands</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Source</th>
                <th>State</th>
                <th>Price</th>
                <th>Result</th>
                <th>Message</th>
              </tr>
            </thead>
            <tbody>
              {commandLog.map((command) => (
                <tr key={command.id}>
                  <td>{formatDateTime(command.createdAt)}</td>
                  <td>{command.source}</td>
                  <td>{command.targetState ? "On" : "Off"}</td>
                  <td>{command.priceEurMwh ?? "-"}</td>
                  <td>{command.isSuccess ? "Success" : "Failed"}</td>
                  <td>{command.message ?? "-"}</td>
                </tr>
              ))}
              {!commandLog.length && (
                <tr>
                  <td colSpan={6}>Select a device history action.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {dashboard?.user.role === 1 && (
        <section>
          <div className="section-head">
            <h2>Users</h2>
            <span>Admin only</span>
          </div>
          <div className="admin-grid">
            <form className="device-form" onSubmit={(event) => void submitUser(event)}>
              <h2>Create user</h2>
              <label>
                Email
                <input value={userDraft.email} type="email" onChange={(event) => setUserDraft({...userDraft, email: event.target.value})} required />
              </label>
              <label>
                Username
                <input value={userDraft.username} onChange={(event) => setUserDraft({...userDraft, username: event.target.value})} required />
              </label>
              <label>
                Password
                <input value={userDraft.password} type="password" onChange={(event) => setUserDraft({...userDraft, password: event.target.value})} required />
              </label>
              <button type="submit">Create user</button>
            </form>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.user_id}>
                      <td>{user.username}</td>
                      <td>{user.email}</td>
                      <td>{user.role === 1 ? "Admin" : "User"}</td>
                      <td>{user.isActive ? "Active" : "Inactive"}</td>
                      <td>
                        <div className="button-row">
                          <button type="button" onClick={() => void runAction(async () => {
                            await deactivateUser(user.user_id);
                            setUsers(await getUsers());
                          })}>
                            Deactivate
                          </button>
                          <button type="button" className="danger" onClick={() => void runAction(async () => {
                            await deleteUser(user.user_id);
                            setUsers(await getUsers());
                          })}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}

function Metric({label, value}: {label: string; value: string}) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function DeviceRow({
  device,
  decision,
  onPower,
  onClear,
  onSave,
  onTest,
  onHistory,
  onDelete,
}: {
  device: Device;
  decision?: Dashboard["decisions"][number];
  onPower: (targetState: boolean) => Promise<void>;
  onClear: () => Promise<void>;
  onSave: (patch: Partial<DeviceDraft>) => Promise<void>;
  onTest: () => Promise<void>;
  onHistory: () => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const overrideLabel = device.overrideState === 1 ? "Override on" : device.overrideState === 2 ? "Override off" : "Automatic";
  const [draft, setDraft] = useState({
    priceLimit: device.priceLimit,
    powerKw: device.powerKw,
    isCritical: device.isCritical,
  });

  return (
    <article className="device">
      <div>
        <h3>{device.name}</h3>
        <p>{device.description || "No description"}</p>
        <div className="chips">
          <span>{device.priceLimit} EUR/MWh</span>
          <span>{device.powerKw} kW</span>
          <span>{device.isCritical ? "Critical" : "Flexible"}</span>
          <span>{overrideLabel}</span>
        </div>
        <p className="decision">{decision?.reason ?? "Waiting for price data"}</p>
        <div className="mini-form">
          <label>
            Threshold
            <input type="number" value={draft.priceLimit} onChange={(event) => setDraft({...draft, priceLimit: Number(event.target.value)})} />
          </label>
          <label>
            Power
            <input type="number" min="0" step="0.1" value={draft.powerKw} onChange={(event) => setDraft({...draft, powerKw: Number(event.target.value)})} />
          </label>
          <label className="toggle">
            <input type="checkbox" checked={draft.isCritical} onChange={(event) => setDraft({...draft, isCritical: event.target.checked})} />
            Critical
          </label>
        </div>
      </div>
      <div className="device-actions">
        <span className={device.isEnabled ? "state on" : "state off"}>{device.isEnabled ? "On" : "Off"}</span>
        <button type="button" onClick={() => void onPower(true)}>On</button>
        <button type="button" onClick={() => void onPower(false)}>Off</button>
        <button type="button" onClick={() => void onClear()}>Auto</button>
        <button type="button" onClick={() => void onSave(draft)}>Save</button>
        <button type="button" onClick={() => void onTest()}>Test</button>
        <button type="button" onClick={() => void onHistory()}>History</button>
        <button type="button" className="danger" onClick={() => void onDelete()}>Delete</button>
      </div>
    </article>
  );
}

function formatHour(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatTime(value: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(value);
}
