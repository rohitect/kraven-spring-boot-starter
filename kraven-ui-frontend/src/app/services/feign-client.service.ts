import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError, map } from 'rxjs';
import { ConfigService } from './config.service';
import { FeignClient } from '../models/feign-client.model';

@Injectable({
  providedIn: 'root'
})
export class FeignClientService {
  constructor(private http: HttpClient, private configService: ConfigService) {}

  /**
   * Fetches all Feign clients from the server.
   */
  getFeignClients(): Observable<FeignClient[]> {
    const config = this.configService.getConfig();
    if (!config.feignClient?.enabled) {
      console.log('Feign client feature is disabled');
      return of([]);
    }

    const apiPath = config.feignClient?.apiPath || '/kraven/v1/feign-clients';
    console.log('Fetching Feign clients from:', apiPath);

    // First try the debug endpoint to check if the controller is accessible
    this.http.get(`${apiPath}/debug`).subscribe(
      response => console.log('Debug endpoint response:', response),
      error => console.error('Debug endpoint error:', error)
    );

    return this.http.get<FeignClient[]>(apiPath).pipe(
      catchError(error => {
        console.error('Error fetching Feign clients:', error);
        console.error('Response text:', error.error?.text || 'No response text');
        return of([]);
      })
    );
  }

  /**
   * Fetches a specific Feign client by name.
   *
   * @param name the name of the Feign client
   */
  getFeignClient(name: string): Observable<FeignClient | null> {
    const config = this.configService.getConfig();
    if (!config.feignClient?.enabled) {
      console.log('Feign client feature is disabled');
      return of(null);
    }

    const apiPath = config.feignClient?.apiPath || '/kraven/v1/feign-clients';
    const url = `${apiPath}/${name}`;
    console.log('Fetching Feign client from:', url);

    // First try the debug endpoint to check if the controller is accessible
    this.http.get(`${apiPath}/debug`).subscribe(
      response => console.log('Debug endpoint response before getting client:', response),
      error => console.error('Debug endpoint error before getting client:', error)
    );

    return this.http.get<FeignClient>(url).pipe(
      catchError(error => {
        console.error('Error fetching Feign client:', error);
        console.error('Response text:', error.error?.text || 'No response text');
        return of(null);
      })
    );
  }

  /**
   * Executes a Feign client method.
   *
   * @param clientName the name of the Feign client
   * @param methodName the name of the method
   * @param parameters the parameters for the method
   */
  executeMethod(clientName: string, methodName: string, parameters: any): Observable<any> {
    const config = this.configService.getConfig();
    if (!config.feignClient?.enabled) {
      console.log('Feign client feature is disabled');
      return of(null);
    }

    const apiPath = config.feignClient?.apiPath || '/kraven/v1/feign-clients';
    console.log('Executing Feign client method:', apiPath + '/' + clientName + '/methods/' + methodName + '/execute');

    return this.http.post(`${apiPath}/${clientName}/methods/${methodName}/execute`, parameters).pipe(
      catchError(error => {
        console.error('Error executing Feign client method:', error);
        console.error('Response text:', error.error?.text || 'No response text');
        return of({ error: error.message || 'Failed to execute method' });
      })
    );
  }


}
